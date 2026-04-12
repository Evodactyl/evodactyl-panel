---
title: Configuring Wings
description: Generate the Wings config from the Panel admin UI.
sidebar:
    order: 3
---

:::note[Upstream project]
Wings is an **independent upstream project** ([pterodactyl/wings](https://github.com/pterodactyl/wings)),
not part of Evodactyl. The config file format below is Wings's own format — we don't control it, we
just generate a `config.yml` that satisfies it. See the [Wings overview](/evodactyl-panel/wings/) for the
relationship between the two projects.
:::

Wings reads its configuration from `/etc/pterodactyl/config.yml`. The Evodactyl panel generates that
file for you once a node is created.

## Create a node in the admin UI

In the Panel, navigate to **Admin → Nodes → New Node**. Fill in:

- **Name** — a display name for the node (e.g. `node-us-1`).
- **Location** — the location this node belongs to (create one under **Admin → Locations** first if needed).
- **FQDN** — the publicly reachable DNS name Wings will listen on.
- **Communicate Over SSL** — enable this unless you really want plaintext.
- **Daemon Port** — usually `8080`.
- **Daemon SFTP Port** — usually `2022`.

After saving, open the node's **Configuration** tab. The Panel renders a `config.yml` ready to paste into
`/etc/pterodactyl/config.yml` on the node host — along with a one-line `wings configure` command that pairs
the node with the Panel using an auth token.

## Pair the node

```bash
cd /etc/pterodactyl && sudo wings configure \
    --panel-url https://panel.example.com \
    --token <generated-token> \
    --node <node-id>
```

This writes `/etc/pterodactyl/config.yml` on the host. Next step is to run Wings as a systemd service — see
[Running Wings as a service](/evodactyl-panel/wings/systemd/).
