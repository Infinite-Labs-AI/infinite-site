/**
 * Serves the launch-video dataset fixture from its OWN process, printing "PORT=<n>" once ready.
 *
 * It has to be a separate process: test-prepare-static-deploy runs the deploy build with
 * execFileSync, which blocks the parent's event loop for the whole build — an in-process server
 * would sit in that same loop and could never answer the child's fetch. The symptom is a build that
 * fails with a bare "fetch failed" and no clue why.
 */
import { createServer } from "node:http";
import { datasetFixture } from "./launch-videos-dataset.mjs";

const payload = JSON.stringify(datasetFixture(Number(process.argv[2]) || 60));
const server = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(payload);
});
server.listen(0, "127.0.0.1", () => {
  process.stdout.write(`PORT=${server.address().port}\n`);
});
