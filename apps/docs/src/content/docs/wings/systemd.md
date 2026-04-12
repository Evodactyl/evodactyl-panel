---
title: Running Wings as a service
description: Run Wings under systemd so it restarts on boot.
sidebar:
    order: 4
---

:::note[Upstream project]
The systemd unit below runs **upstream [pterodactyl/wings](https://github.com/pterodactyl/wings)**,
an independent Go daemon. Evodactyl is the panel that talks to it over JWT; we do not ship Wings.
:::

Create `/etc/systemd/system/wings.service`:

```ini title="/etc/systemd/system/wings.service"
[Unit]
Description=Pterodactyl Wings Daemon
After=docker.service
Requires=docker.service
PartOf=docker.service

[Service]
User=root
WorkingDirectory=/etc/pterodactyl
LimitNOFILE=4096
PIDFile=/var/run/wings/daemon.pid
ExecStart=/usr/local/bin/wings
Restart=on-failure
StartLimitInterval=600

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
systemctl enable --now wings
```

Check logs with:

```bash
journalctl -u wings -f
```
