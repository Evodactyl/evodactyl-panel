---
title: Wings
description: The game-server daemon Evodactyl talks to. Upstream project, not part of this repo.
sidebar:
    label: Overview
    order: 1
---

:::caution[Wings is a separate project]
**Wings is not part of Evodactyl.** It is the upstream [Pterodactyl Wings][wings-repo] daemon — an
independent Go project, maintained by the Pterodactyl team, released under its own license, and
installed from its own releases page.

Evodactyl is a panel. Wings is the daemon that actually runs game-server containers on node hosts
and talks back to the panel. The two projects speak a stable JWT-signed HTTP + WebSocket protocol
that Evodactyl implements and Wings implements. That protocol is the only coupling between them.

We re-document the install and configure flow here because every Evodactyl install needs at least
one Wings node, and having the steps next to the panel install makes the Getting Started flow
self-contained. **But the source of truth for Wings itself is always the upstream repository** —
binaries, configuration format, release notes, and bugs all live there.
:::

## What Wings does

- Runs game-server containers on a Linux host via the Docker API.
- Exposes an SFTP server so end users can edit files inside their game-server volume.
- Streams console output and resource stats to the panel over WebSocket.
- Pulls per-server configuration from Evodactyl's Remote API (`/api/remote/*`) and receives power /
  backup / file-management commands via short-lived JWTs signed by the panel.

## What Wings is not

- Not an HTTP panel. It has no UI.
- Not a database. It stores only ephemeral per-server runtime state on disk.
- Not Evodactyl. It is a separate Go binary maintained by a separate project with its own release
  cadence, issue tracker, and maintainers.

## How the two fit together

```
    end user ─── HTTPS ───►  Evodactyl Panel  ◄── JWT (HTTP + WS) ───►  Wings daemon  ──►  Docker
    (browser)               (Bun/TS, this repo)                         (Go, upstream)       (game server
                                                                                              containers)
```

The panel issues JWTs signed with a per-node daemon token. Wings verifies the signature and acts on
behalf of the requesting user (start a server, tail logs, stream a backup, etc). Wings does not
touch the panel database directly — everything goes through `/api/remote/*`.

## Pages in this section

- [Installing Wings](/evodactyl-panel/wings/installing/)
- [Configuring Wings](/evodactyl-panel/wings/configuring/)
- [Running Wings as a service](/evodactyl-panel/wings/systemd/)
- [Troubleshooting](/evodactyl-panel/wings/troubleshooting/)

## Upstream links

- Repository: <https://github.com/pterodactyl/wings>
- Releases: <https://github.com/pterodactyl/wings/releases>
- Issues (Wings bugs, not panel bugs): <https://github.com/pterodactyl/wings/issues>

[wings-repo]: https://github.com/pterodactyl/wings
