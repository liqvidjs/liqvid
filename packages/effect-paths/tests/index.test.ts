import { RelativeFile } from "../src";

// template strings
RelativeFile("package.json") satisfies RelativeFile<`${string}.json`>;
