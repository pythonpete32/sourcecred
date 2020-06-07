// @flow

import deepFreeze from "deep-freeze";
import type {PluginDeclaration} from "../../analysis/pluginDeclaration";
import type {NodeType, EdgeType} from "../../analysis/types";
import {NodeAddress, EdgeAddress} from "../../core/graph";

export const nodePrefix = NodeAddress.fromParts(["sourcecred", "discord"]);
export const edgePrefix = EdgeAddress.fromParts(["sourcecred", "discord"]);

export const memberNodeType: NodeType = deepFreeze({
  name: "Member",
  pluralName: "Members",
  prefix: NodeAddress.append(nodePrefix, "MEMBER"),
  defaultWeight: 0,
  description: "A member of the Discord server",
});

export const messageNodeType: NodeType = deepFreeze({
  name: "Message",
  pluralName: "Messages",
  prefix: NodeAddress.append(nodePrefix, "MESSAGE"),
  defaultWeight: 0,
  description: "A Discord message, posted in a particular channel",
});

export const reactionNodeType: NodeType = deepFreeze({
  name: "Reaction",
  pluralName: "Reactions",
  prefix: NodeAddress.append(nodePrefix, "REACTION"),
  defaultWeight: 1,
  description: "A reaction by some user, directed at some message",
});

export const authorsMessageEdgeType: EdgeType = deepFreeze({
  forwardName: "authors message",
  backwardName: "message is authored by",
  prefix: EdgeAddress.append(edgePrefix, "AUTHORS", "MESSAGE"),
  defaultWeight: {forwards: 1 / 4, backwards: 1},
  description: "Connects an author to a message they've created.",
});

export const addsReactionEdgeType: EdgeType = deepFreeze({
  forwardName: "adds reaction",
  backwardName: "reaction added by",
  prefix: EdgeAddress.append(edgePrefix, "ADDS_REACTION"),
  defaultWeight: {forwards: 1, backwards: 1 / 16},
  description: "Connects a member to a reaction that they added.",
});

export const reactsToEdgeType: EdgeType = deepFreeze({
  forwardName: "reacts to",
  backwardName: "is reacted to by",
  prefix: EdgeAddress.append(edgePrefix, "REACTS_TO"),
  defaultWeight: {forwards: 1, backwards: 1 / 16},
  description: "Connects a reaction to a message that it reacts to.",
});

export const mentionsEdgeType: EdgeType = deepFreeze({
  forwardName: "mentions",
  backwardName: "is mentioned by",
  prefix: EdgeAddress.append(edgePrefix, "MENTIONS"),
  defaultWeight: {forwards: 1, backwards: 1 / 16},
  description: "Connects a message to the member being mentioned.",
});

export const declaration: PluginDeclaration = deepFreeze({
  name: "Discord",
  nodePrefix,
  edgePrefix,
  nodeTypes: [memberNodeType, messageNodeType, reactionNodeType],
  edgeTypes: [
    authorsMessageEdgeType,
    addsReactionEdgeType,
    reactsToEdgeType,
    mentionsEdgeType,
  ],
  userTypes: [memberNodeType],
});
