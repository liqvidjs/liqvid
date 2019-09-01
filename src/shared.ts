/*
  This file is a hideous hack to get around some circular dependency annoyances.
*/
import * as React from "react";
import Player from "./Player";

export const PlayerContext = React.createContext<Player>(null);
