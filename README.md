<p align="center">
  <img src="https://avatars.githubusercontent.com/u/274653358?s=200&v=4" width="160" alt="Evodactyl" />
</p>

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/Evodactyl/evodactyl-panel/build.yaml?label=Tests&style=for-the-badge&branch=main)
![GitHub Releases](https://img.shields.io/github/downloads/Evodactyl/evodactyl-panel/latest/total?style=for-the-badge)
![GitHub contributors](https://img.shields.io/github/contributors/Evodactyl/evodactyl-panel?style=for-the-badge)

# Evodactyl Panel

Evodactyl is an open-source game server management panel, rebuilt from the ground up on **Bun**, **TypeScript**,
**Express 5**, **Prisma**, and **React**. It is the evolution of the original PHP/Laravel [Pterodactyl Panel],
carrying its model of isolated-container game servers into a fully modern stack while staying wire-compatible
with the existing **Wings** daemon.

Like Pterodactyl, Evodactyl runs every game server in its own Docker container and exposes a fast, polished UI
to end users and administrators. Unlike Pterodactyl, there is no PHP, no Composer, no queue worker, and no
crontab — the panel is one Bun process.

## Install

On a fresh Linux host with Docker installed, paste this into a root shell:

```bash
sudo bash <(curl -fsSL https://raw.githubusercontent.com/Evodactyl/evodactyl-panel/main/scripts/install.sh)
```

It prompts you for a panel URL, an admin account, and optional SMTP, then clones this repo, builds
the panel image from source, brings up a MariaDB + Redis + panel stack, runs migrations, seeds
default eggs, and creates your first admin user. See the
[install docs](https://evodactyl.github.io/evodactyl-panel/start/) for the script's prerequisites
and what it creates.

## Documentation

Full documentation lives at **<https://evodactyl.github.io/evodactyl-panel/>** and is built from
[`apps/docs/`](apps/docs/) in this repository. Run it locally with `bun run docs:dev`.

For local development see [`BUILDING.md`](BUILDING.md).

## License

Evodactyl is released under the [MIT License](./LICENSE.md).

Copyright © 2015–2022 Dane Everitt and contributors — original Pterodactyl Panel.
Copyright © 2026 Evodactyl contributors — Evodactyl rewrite and continued development.

[Pterodactyl Panel]: https://github.com/pterodactyl/panel
