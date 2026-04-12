---
title: Installing Wings
description: Install the Wings daemon on a node host.
sidebar:
    order: 2
---

:::note[Upstream project]
Wings is [pterodactyl/wings][wings-repo], a separate Go daemon maintained by the Pterodactyl team —
not part of Evodactyl. These steps install the upstream binary from its GitHub releases and pair it
with an Evodactyl panel. See the [Wings overview](/evodactyl-panel/wings/) for what the two projects share
and what they do not.
:::

Install Docker and the upstream Wings binary on the host that will run game servers, then pair it
with the Evodactyl panel from the admin UI.

## Prerequisites

- A Linux host with Docker 20.10+ installed.
- Kernel ≥ 4.19 with cgroups v2 support (most modern distributions).
- Root access.

## Install Docker

```bash
curl -sSL https://get.docker.com/ | CHANNEL=stable bash
systemctl enable --now docker
```

## Install the Wings binary

```bash
mkdir -p /etc/pterodactyl
curl -L -o /usr/local/bin/wings \
    "https://github.com/pterodactyl/wings/releases/latest/download/wings_linux_$([[ "$(uname -m)" == "x86_64" ]] && echo "amd64" || echo "arm64")"
chmod u+x /usr/local/bin/wings
```

Wings expects its config at `/etc/pterodactyl/config.yml`. The next page, [Configuring Wings](/evodactyl-panel/wings/configuring/),
walks through generating that config from the admin UI.

:::note
The binary lives at `/usr/local/bin/wings` and the config at `/etc/pterodactyl/config.yml`. These
paths come from **upstream Wings** — Evodactyl does not rename them. They keep the
`pterodactyl` prefix because that's what the upstream daemon uses.
:::

[wings-repo]: https://github.com/pterodactyl/wings
