import "@/app/liqvid.css";

import {
  liqvidGenerateProjectMetadata,
  liqvidProject,
} from "@liqvid/studio/next";

import { ClientContent } from "./client.tsx";

export default liqvidProject(import.meta.url, function Page({ projectPath }) {
  return <ClientContent {...{ projectPath }} />;
});

export const generateMetadata = liqvidGenerateProjectMetadata(import.meta.url);
