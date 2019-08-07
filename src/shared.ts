/*
  This file is a hideous hack to get around some circular dependency annoyances.
*/

import * as React from "react";
import {createContextBroadcaster} from "./utils/react-utils";
import Player from "./Player";

export const PlayerContext = React.createContext<Player>();

export const PlayerReceiverSymbol: symbol = Symbol();
export const PlayerReceiver = class Receiver<P = {}, S = {}> extends React.Component<P & {player?: Player}, S> {};
export const PlayerPureReceiver = class PureReceiver<P = {}, S = {}> extends React.PureComponent<P & {player?: Player}, S> {};

PlayerReceiver[PlayerReceiverSymbol] = true;
PlayerPureReceiver[PlayerReceiverSymbol] = true;

export const PlayerBroadcaster = createContextBroadcaster(PlayerContext, PlayerReceiverSymbol, "player");
