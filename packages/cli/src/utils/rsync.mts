import * as child_process from "node:child_process";

import chalk from "chalk";

export interface RsyncOptions {
  host: string;
  localDir: string;
  password?: string; // Optional: SSH password (not recommended)
  port?: number; // Optional: SSH Port
  recursive?: boolean; // Optional:  Recursive synchronization.  Default is true.
  remoteDir: string;
  username?: string; // Optional: SSH username
}

export async function rsyncRemoteDirectory(
  options: RsyncOptions,
): Promise<void> {
  const {
    localDir,
    remoteDir,
    host,
    username,
    password,
    port,
    // recursive = true,
  } = options;

  // Build SSH command with port if specified
  const sshOptions = [];
  if (port) {
    sshOptions.push(`-p ${port}`);
  }
  const sshRsh = sshOptions.length > 0 ? `ssh ${sshOptions.join(" ")}` : "ssh";

  // Construct the rsync command with expanded flags
  const rsyncCommand = [
    "rsync",
    "--archive", // -a: archive mode (recursive, preserves permissions, etc.)
    "--verbose", // -v: verbose mode
    "--compress", // -z: compress data during transfer
    "--progress",
    `--rsh=${sshRsh}`, // Use SSH as the transport with optional port
    `"${localDir}"/`, // Source directory (note the trailing slash!)
    `"${username ? `${username}@` : ""}${host}:${remoteDir}"`, // Destination directory
  ];

  // Check if username and password are provided
  if (username && password) {
    // Display warning for password usage
    console.warn(
      chalk.red("⚠️  WARNING: Using SSH password authentication is not secure!"),
    );
    console.warn(
      chalk.red("   Consider using SSH keys instead for better security."),
    );

    const portOption = port ? `-p ${port}` : "";
    const sshCommand = `ssh ${username}@${host} ${portOption} -tt 'rsync --archive --verbose --compress --progress "${localDir}/" "${host}:${remoteDir}" && echo "rsync completed successfully"'`;

    return new Promise<void>((resolve, reject) => {
      child_process.exec(
        sshCommand,
        (error: unknown, _stdout: string, _stderr: string) => {
          if (error) {
            console.error("Error executing rsync command:", error);
            reject(error);
          } else {
            resolve();
          }
        },
      );
    });
  } else {
    return new Promise<void>((resolve, reject) => {
      const command = rsyncCommand.join(" ");
      child_process.exec(
        command,
        (error: unknown, _stdout: string, _stderr: string) => {
          if (error) {
            console.error("Error executing rsync command:", error);
            reject(error);
          } else {
            // console.log(stdout);
            resolve();
          }
        },
      );
    });
  }
}
