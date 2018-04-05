# tipmevia

Tipping for Telegram with Viacoin

![Logo](https://raw.githubusercontent.com/abrkn/tipmebch/master/logo.png)

## Warning

This software is highly experimental and may lead to loss of funds.
The author takes no responsibility for your money.

## Installation

```bash
npm install
```

## Configuration

Define the environment variables:

```bash
export TELEGRAM_BOT_TOKEN=496343161:yoursecret
export VIACOIND_URL=http://rpcuser:rpcpassword@localhost:8333
export STAFF_USER_ID=403107081
export TELEGRAM_BOT_USERNAME=TipMeViaBot
export DEFAULT_STICKER_SET=pepe
export REDIS_URL=redis://localhost
```

## Running

```bash
npm start
```

## Stickers sets

See [sticker set documentation](docs/stickers.md)

## License

See [LICENSE](LICENSE)

## Author

Andreas Brekken <mailto:andreas@brekken.com>
