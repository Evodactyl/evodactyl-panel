---
title: 'Next: Wings'
description: Install the Wings daemon so the Panel has somewhere to run game servers.
---

The Panel is live and reachable over HTTPS. You have an admin user. You can sign in. But the Panel has
no nodes yet — and without a node, there is nowhere for game server containers to run.

Next, install **Wings** on a host (which may be the same machine as the Panel for small setups, or a
separate VM for larger ones) and pair it with the Panel.

:::note[Wings is a separate upstream project]
Wings is **not part of Evodactyl**. It is the independent
[pterodactyl/wings](https://github.com/pterodactyl/wings) Go daemon, maintained by the Pterodactyl
team. Evodactyl is a panel that speaks its protocol; Wings is the thing that actually runs your
game server containers. Different repos, different maintainers, different release cadence — see the
[Wings overview](/evodactyl-panel/wings/) for the full relationship.
:::

## Wings in three steps

1. **[Install Wings](/evodactyl-panel/wings/installing/)** — Docker + the Wings binary on the node host.
2. **[Configure Wings](/evodactyl-panel/wings/configuring/)** — create a node in the admin UI, paste the generated
   `/etc/pterodactyl/config.yml` onto the host.
3. **[Run Wings as a systemd service](/evodactyl-panel/wings/systemd/)** — so it survives reboots.

Once Wings is paired and running, the admin UI's **Nodes** page shows the node as healthy with a green
heartbeat. At that point you can create your first server under **Admin → Servers → New Server** — pick
the node you just added, a nest and egg (start with Minecraft/Vanilla if you want something simple), and
submit.

Welcome to Evodactyl.
