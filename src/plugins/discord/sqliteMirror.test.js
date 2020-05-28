// @flow

import {type TimestampMs} from "../../util/timestamp";
import Database from "better-sqlite3";
import {SqliteMirror} from "./sqliteMirror";
import dedent from "../../util/dedent";
import {
  type Channel,
  type Message,
  type GuildMember,
  type Snowflake,
  type Emoji,
  type User,
} from "./models";

describe("plugins/discord/sqliteMirror", () => {
  const customEmoji = (): Emoji => ({id: "id", name: "name"});
  const genericEmoji = (): Emoji => ({id: null, name: "🐙"});

  const testChannel = (id: Snowflake): Channel => ({
    id: id,
    name: "testChannelName",
    type: "GUILD_TEXT",
  });

  const testMessage = (
    id: Snowflake,
    channelId: Snowflake,
    authorId: Snowflake,
    timestampMs: TimestampMs = Date.parse("2020-03-03T23:35:10.615000+00:00")
  ): Message => ({
    id: id,
    channelId: channelId,
    authorId: authorId,
    timestampMs: timestampMs,
    content: "Just going to drop this here",
    reactionEmoji: [customEmoji()],
    nonUserAuthor: false,
    mentions: ["1", "23"],
  });

  const testUser = (id: Snowflake): User => ({
    id: id,
    username: "username",
    discriminator: "disc",
    bot: true,
  });

  const testMember = (userId: Snowflake): GuildMember => ({
    user: testUser(userId),
    nick: "nickname",
  });

  describe("constructor", () => {
    it("initializes a new database succsessfully", () => {
      const db = new Database(":memory:");
      expect(() => new SqliteMirror(db, "0")).not.toThrow();
    });

    it("rejects a different config", () => {
      const db = new Database(":memory:");
      const _ = new SqliteMirror(db, "0");
      expect(() => new SqliteMirror(db, "1")).toThrow(
        "Database already populated with incompatible server or version"
      );
    });

    it("creates the right set of tables", () => {
      const db = new Database(":memory:");
      new SqliteMirror(db, "0");
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .pluck()
        .all();
      expect(tables.sort()).toEqual(
        [
          "meta",
          "channels",
          "users",
          "members",
          "messages",
          "message_reactions",
          "message_mentions",
        ].sort()
      );
    });
  });

  describe("users", () => {
    it("inserts users", async () => {
      const user = testUser("1");
      const db = new Database(":memory:");
      const sqliteMirror = new SqliteMirror(db, "0");
      sqliteMirror.addUser(user);
      const result = db
        .prepare(
          dedent`\
            SELECT
              id,
              username,
              discriminator,
              bot
            FROM users
          `
        )
        .get();
      expect(result).toEqual({
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        bot: 1,
      });
    });

    describe("user", () => {
      it("retrieves user", () => {
        const user: User = testUser("1");
        const db = new Database(":memory:");
        const sqliteMirror = new SqliteMirror(db, "0");
        sqliteMirror.addUser(user);
        const result = sqliteMirror.user(user.id);
        expect(result).toEqual(user);
      });

      it("returns null if user not in table", () => {
        const db = new Database(":memory:");
        const sqliteMirror = new SqliteMirror(db, "0");
        const result = sqliteMirror.user("1");
        expect(result).toEqual(null);
      });
    });

    it("retrieves users", async () => {
      const user1: User = testUser("1");
      const user2: User = testUser("2");
      const db = new Database(":memory:");
      const sqliteMirror = new SqliteMirror(db, "0");
      sqliteMirror.addUser(user1);
      sqliteMirror.addUser(user2);
      const result = sqliteMirror.users();
      expect(result).toEqual([user1, user2]);
    });
  });

  describe("members", () => {
    it("inserts members", async () => {
      const member = testMember("1");
      const db = new Database(":memory:");
      const sqliteMirror = new SqliteMirror(db, "0");
      sqliteMirror.addMember(member);
      const result = db
        .prepare(
          dedent`\
            SELECT
              user_id,
              nick
            FROM members`
        )
        .get();
      expect(result).toEqual({
        user_id: member.user.id,
        nick: member.nick,
      });
    });

    it("inserts user", () => {
      const member = testMember("1");
      const db = new Database(":memory:");
      const sqliteMirror = new SqliteMirror(db, "0");
      sqliteMirror.addMember(member);
      expect(sqliteMirror.user(member.user.id)).toEqual(member.user);
    });

    it("retrieves members", async () => {
      const mem1: GuildMember = testMember("1");
      const mem2: GuildMember = testMember("2");
      const db = new Database(":memory:");
      const sqliteMirror = new SqliteMirror(db, "0");
      sqliteMirror.addMember(mem1);
      sqliteMirror.addMember(mem2);
      const result = sqliteMirror.members();
      expect(result).toEqual([mem1, mem2]);
    });
  });

  describe("member", () => {
    it("retrieves member", () => {
      const member: GuildMember = testMember("1");
      const db = new Database(":memory:");
      const sqliteMirror = new SqliteMirror(db, "0");
      sqliteMirror.addMember(member);
      const result = sqliteMirror.member(member.user.id);
      expect(result).toEqual(member);
    });

    it("returns null if user not in table", () => {
      const db = new Database(":memory:");
      const sqliteMirror = new SqliteMirror(db, "0");
      const result = sqliteMirror.member("1");
      expect(result).toEqual(null);
    });
  });

  describe("channels", () => {
    it("inserts channels", async () => {
      const channel = testChannel("1");
      const db = new Database(":memory:");
      const sqliteMirror = new SqliteMirror(db, "0");
      sqliteMirror.addChannel(channel);
      const result = await db
        .prepare("SELECT id, type, name FROM channels")
        .get();
      expect(result).toEqual(channel);
    });

    it("retrieves channels", () => {
      const ch1: Channel = testChannel("1");
      const ch2: Channel = testChannel("2");
      const db = new Database(":memory:");
      const sqliteMirror = new SqliteMirror(db, "0");
      sqliteMirror.addChannel(ch1);
      sqliteMirror.addChannel(ch2);
      const result = sqliteMirror.channels();
      expect(result).toEqual([ch1, ch2]);
    });
  });

  describe("messages", () => {
    it("inserts messages", async () => {
      const messageId = "1";
      const channelId = "2";
      const authorId = "3";
      const db = new Database(":memory:");
      const sqliteMirror = new SqliteMirror(db, "0");
      sqliteMirror.addUser(testUser(authorId));
      sqliteMirror.addChannel(testChannel(channelId));
      sqliteMirror.addMessage(testMessage(messageId, channelId, authorId));
      const result = await db
        .prepare(
          dedent`\
            SELECT
              id,
              channel_id,
              author_id,
              non_user_author,
              timestamp_ms,
              content
            FROM messages`
        )
        .get();
      expect(result).toEqual({
        id: "1",
        channel_id: "2",
        author_id: "3",
        non_user_author: 0,
        timestamp_ms: 1583278510615,
        content: "Just going to drop this here",
      });
    });

    describe("nthMessageIdFromTail", () => {
      function buildMessages() {
        const channelId: Snowflake = "1";
        const authorId: Snowflake = "2";

        const db = new Database(":memory:");
        const sqliteMirror = new SqliteMirror(db, "0");
        sqliteMirror.addUser(testUser(authorId));
        sqliteMirror.addChannel(testChannel(channelId));

        for (let x = 1; x <= 10; x++) {
          const msg = testMessage(String(x), channelId, authorId, x * 2);
          sqliteMirror.addMessage(msg);
        }
        return {sqliteMirror, channelId};
      }
      it("retrieves nth message from tail", () => {
        const {sqliteMirror, channelId} = buildMessages();
        expect(sqliteMirror.nthMessageIdFromTail(channelId, 3)).toBe("7");
      });
      it("handles n greater than total message count", () => {
        const {sqliteMirror, channelId} = buildMessages();
        expect(sqliteMirror.nthMessageIdFromTail(channelId, 20)).toBe(
          undefined
        );
      });
    });

    it("retrieves messages", () => {
      const messageId1 = "1";
      const messageId2 = "2";
      const channelId = "3";
      const authorId = "4";
      const mes1: Message = testMessage(messageId1, channelId, authorId);
      const mes2: Message = testMessage(messageId2, channelId, authorId);

      const db = new Database(":memory:");
      const sqliteMirror = new SqliteMirror(db, "0");
      sqliteMirror.addUser(testUser(authorId));
      sqliteMirror.addChannel(testChannel(channelId));
      sqliteMirror.addMessage(mes1);
      sqliteMirror.addMessage(mes2);

      for (const user of mes1.mentions) {
        sqliteMirror.addUser(testUser(user));
        sqliteMirror.addMention(mes1, user);
      }

      for (const user of mes2.mentions) {
        sqliteMirror.addUser(testUser(user));
        sqliteMirror.addMention(mes2, user);
      }

      for (const emoji of mes1.reactionEmoji) {
        sqliteMirror.addReaction({
          emoji,
          channelId: mes1.channelId,
          messageId: mes1.id,
          authorId: mes1.authorId,
        });
      }

      for (const emoji of mes2.reactionEmoji) {
        sqliteMirror.addReaction({
          emoji,
          channelId: mes2.channelId,
          messageId: mes2.id,
          authorId: mes2.authorId,
        });
      }

      const result = sqliteMirror.messages(channelId);
      expect(result).toEqual([mes1, mes2]);
    });
  });

  describe("reactions", () => {
    it("inserts reactions", async () => {
      const channelId: Snowflake = "2";
      const messageId: Snowflake = "3";
      const authorId: Snowflake = "4";
      const reaction = {
        emoji: customEmoji(),
        channelId: channelId,
        messageId: messageId,
        authorId: authorId,
      };
      const db = new Database(":memory:");
      const sqliteMirror = new SqliteMirror(db, "0");
      sqliteMirror.addUser(testUser(authorId));
      sqliteMirror.addChannel(testChannel(channelId));
      sqliteMirror.addMessage(testMessage(messageId, channelId, authorId));
      sqliteMirror.addReaction(reaction);
      const result = await db
        .prepare(
          dedent`\
            SELECT
              channel_id,
              author_id,
              message_id,
              emoji
            FROM message_reactions`
        )
        .get();
      expect(result).toEqual({
        emoji: "name:id",
        channel_id: channelId,
        message_id: messageId,
        author_id: authorId,
      });
    });
    it("retrieves reactions", () => {
      const channelId: Snowflake = "1";
      const messageId: Snowflake = "2";
      const authorId1 = "3";
      const authorId2 = "4";

      const reaction1 = {
        emoji: customEmoji(),
        channelId: channelId,
        messageId: messageId,
        authorId: authorId1,
      };

      const reaction2 = {
        emoji: genericEmoji(),
        channelId: channelId,
        messageId: messageId,
        authorId: authorId2,
      };

      const db = new Database(":memory:");
      const sqliteMirror = new SqliteMirror(db, "0");
      sqliteMirror.addUser(testUser(authorId1));
      sqliteMirror.addUser(testUser(authorId2));
      sqliteMirror.addChannel(testChannel(channelId));
      sqliteMirror.addMessage(testMessage(messageId, channelId, authorId1));
      sqliteMirror.addReaction(reaction1);
      sqliteMirror.addReaction(reaction2);
      const result = sqliteMirror.reactions(channelId, messageId);
      expect(result).toEqual([reaction1, reaction2]);
    });
  });

  describe("mentions", () => {
    it("inserts mentions", async () => {
      const messageId: Snowflake = "1";
      const channelId: Snowflake = "2";
      const authorId: Snowflake = "3";
      const message: Message = testMessage(messageId, channelId, authorId);
      const userId: Snowflake = "45";
      const db = new Database(":memory:");
      const sqliteMirror = new SqliteMirror(db, "0");
      sqliteMirror.addUser(testUser(userId));
      sqliteMirror.addUser(testUser(authorId));
      sqliteMirror.addChannel(testChannel(channelId));
      sqliteMirror.addMessage(testMessage(messageId, channelId, authorId));
      sqliteMirror.addMention(message, userId);
      const result = await db
        .prepare(
          `\
          SELECT
            channel_id,
            message_id,
            user_id
          FROM message_mentions`
        )
        .get();
      expect(result).toEqual({
        channel_id: channelId,
        message_id: messageId,
        user_id: userId,
      });
    });

    it("retrieves mentions", () => {
      const messageId: Snowflake = "1";
      const channelId = "2";
      const authorId = "3";
      const message: Message = testMessage(messageId, channelId, authorId);
      const [userId1, userId2] = message.mentions;
      const db = new Database(":memory:");
      const sqliteMirror = new SqliteMirror(db, "0");
      sqliteMirror.addUser(testUser(userId1));
      sqliteMirror.addUser(testUser(userId2));
      sqliteMirror.addUser(testUser(authorId));
      sqliteMirror.addChannel(testChannel(channelId));
      sqliteMirror.addMessage(testMessage(messageId, channelId, authorId));
      sqliteMirror.addMention(message, userId1);
      sqliteMirror.addMention(message, userId2);
      const result = sqliteMirror.mentions(message.channelId, messageId);
      expect(result).toEqual([userId1, userId2]);
    });
  });

  describe("reactionEmoji", () => {
    it("retrieves emojis", () => {
      const channelId: Snowflake = "1";
      const messageId: Snowflake = "2";
      const authorId1: Snowflake = "3";
      const authorId2: Snowflake = "4";
      const messageAuthorId: Snowflake = "5";

      const reaction1 = {
        emoji: customEmoji(),
        channelId: channelId,
        messageId: messageId,
        authorId: authorId1,
      };

      const reaction2 = {
        emoji: genericEmoji(),
        channelId: channelId,
        messageId: messageId,
        authorId: authorId2,
      };

      const db = new Database(":memory:");
      const sqliteMirror = new SqliteMirror(db, "0");
      sqliteMirror.addUser(testUser(authorId1));
      sqliteMirror.addUser(testUser(authorId2));
      sqliteMirror.addChannel(testChannel(channelId));
      sqliteMirror.addMessage(
        testMessage(messageId, channelId, messageAuthorId)
      );
      sqliteMirror.addReaction(reaction1);
      sqliteMirror.addReaction(reaction2);
      const result = sqliteMirror.reactionEmoji(channelId, messageId);
      expect(result).toEqual([customEmoji(), genericEmoji()]);
    });
  });
});
