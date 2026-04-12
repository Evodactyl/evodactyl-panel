---
title: Wings Troubleshooting
description: Common Wings failure modes and their fixes.
sidebar:
    order: 5
---

:::note[Upstream project]
Wings is a separate upstream daemon ([pterodactyl/wings](https://github.com/pterodactyl/wings)), not
part of Evodactyl. If a bug turns out to be in Wings itself, report it at the
[Wings issue tracker](https://github.com/pterodactyl/wings/issues) — not on the Evodactyl panel repo.
:::

This page collects the most common Wings failure modes seen by Evodactyl operators.

## `sudo wings diagnostics`

When reporting a Wings problem, always run:

```bash
sudo wings diagnostics
```

It collects OS info, Docker info, and the last Wings log slice, and uploads the report to a paste service.
Share the returned URL in your issue or support thread.

## Wings cannot reach the Panel

Symptom: Wings logs show `unable to validate authorization credentials`.

- Double-check the Panel URL in `/etc/pterodactyl/config.yml` — it has to match what the Panel thinks its
  own `APP_URL` is.
- Confirm that the Panel's database has `nodes.daemon_token_id` and `nodes.daemon_token` set for this node.
  These get generated when you create the node in the admin UI.

## Wings cannot write to `/var/lib/pterodactyl/volumes`

Symptom: `permission denied` in Wings logs at server creation time.

- Wings runs as root by default; if you changed the systemd unit to run as a non-root user, that user needs
  ownership of `/var/lib/pterodactyl/volumes`.
- If you are on a host with SELinux enforcing, make sure the context on `/var/lib/pterodactyl` allows
  Docker access.

## Game server exits immediately

Check the Docker image tag in the egg matches an image Wings can pull. Many eggs pin `ghcr.io/pterodactyl/yolks:*`
images — if `docker pull` fails on the node host, the server will fail to start.
