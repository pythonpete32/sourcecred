// @flow

import {TaskReporter} from "../../util/taskReporter";
import {type DiscordApi} from "./fetcher";
import {SqliteMirrorRepository} from "./mirrorRepository";
import * as Model from "./models";

// How many messages for each channel to reload.
const RELOAD_DEPTH = 50;

export class Mirror {
  +_repo: SqliteMirrorRepository;
  +_api: DiscordApi;
  +guild: Model.Snowflake;

  constructor(
    repo: SqliteMirrorRepository,
    api: DiscordApi,
    guild: Model.Snowflake
  ) {
    this._repo = repo;
    this._api = api;
    this.guild = guild;
  }

  async update(reporter: TaskReporter) {
    const guild = await this.validateGuildId();
    reporter.start(`discord/${guild.name}`);
    await this.addMembers();
    const channels = await this.addTextChannels();
    for (const channel of channels) {
      reporter.start(`discord/${guild.name}/#${channel.name}`);
      try {
        await this.addMessages(channel.id);
      } catch (e) {
        console.warn(e);
      }
      reporter.finish(`discord/${guild.name}/#${channel.name}`);
    }
    reporter.finish(`discord/${guild.name}`);
  }

  async validateGuildId() {
    const guilds = await this._api.guilds();
    const guild = guilds.find((g) => g.id === this.guild);
    if (!guild) {
      throw new Error(
        `Couldn't find guild with ID ${this.guild}\nMaybe the bot has no access to it?`
      );
    }
    // TODO: validate bot permissions
    return guild;
  }

  async addMembers() {
    const members = await this._api.members(this.guild);
    for (const member of members) {
      this._repo.addMember(member);
    }
    return this._repo.members();
  }

  async addTextChannels() {
    const channels = await this._api.channels(this.guild);
    for (const channel of channels) {
      if (channel.type !== "GUILD_TEXT") continue;
      this._repo.addChannel(channel);
    }
    return this._repo.channels();
  }

  async addMessages(channel: Model.Snowflake, messageLimit?: number) {
    const loadStart = this._repo.nthMessageFromTail(channel, RELOAD_DEPTH);
    // console.log(channel, (loadStart || {}).id);

    const limit = messageLimit || 100;
    let page: $ReadOnlyArray<Model.Message> = [];
    let after: Model.Snowflake = loadStart ? loadStart.id : "0";
    do {
      page = await this._api.messages(channel, after, limit);
      for (const message of page) {
        after = after < message.id ? message.id : after;
        this._repo.addMessage(message);
        for (const emoji of message.reactionEmoji) {
          const reactions = await this._api.reactions(
            channel,
            message.id,
            emoji
          );
          for (const reaction of reactions) {
            this._repo.addReaction(reaction);
          }
        }
      }
    } while (page.length >= limit);
    return this._repo.messages(channel);
  }
}
