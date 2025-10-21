-- Custom SQL migration file, put your code below! ---- Seed data for chains and tokens

-- Insert chains with fixed UUIDv7 IDs
INSERT INTO chains (id, name, chain_id, chain_deid, is_enabled, rpc_url, explorer_url) VALUES
('019a027e-d779-7444-9b8b-23779e6550d7', 'Ethereum', 1, 1, true, 'https://eth.llamarpc.com', 'https://etherscan.io'),
('019a027e-d78f-7444-9b8b-2e080cff6977', 'Polygon', 137, 2, true, 'https://polygon-rpc.com', 'https://polygonscan.com'),
('019a027e-d79a-7444-9b8b-307d7ed7a437', 'Arbitrum', 42161, 3, true, 'https://arb1.arbitrum.io/rpc', 'https://arbiscan.io'),
('019a027e-d7a6-7444-9b8b-3b9ef9d7c9f6', 'Optimism', 10, 4, true, 'https://mainnet.optimism.io', 'https://optimistic.etherscan.io'),
('019a027e-d7b0-7444-9b8b-40542f350726', 'Base', 8453, 5, true, 'https://mainnet.base.org', 'https://basescan.org'),
('019a027e-d7bb-7444-9b8b-4b4a090fb280', 'Avalanche', 43114, 6, true, 'https://api.avax.network/ext/bc/C/rpc', 'https://snowtrace.io'),
('019a027e-d7c7-7444-9b8b-54ce2cab0ea1', 'BNB Chain', 56, 7, true, 'https://bsc-dataseed.binance.org', 'https://bscscan.com'),
('019a027e-d7d2-7444-9b8b-5c7396eff0e7', 'Bitcoin', NULL, 8, true, NULL, 'https://blockchair.com/bitcoin'),
('019a027e-d7dd-7444-9b8b-6543f6bc7056', 'Solana', NULL, 9, true, 'https://api.mainnet-beta.solana.com', 'https://explorer.solana.com');

-- Insert tokens with fixed UUIDv7 IDs
INSERT INTO tokens (id, symbol, canonical_name, description, website_url, logo_big_url, logo_small_url, logo_thumb_url) VALUES
('019a027e-d7e9-7444-9b8b-6b009cdc9af5', 'ETH', 'Ethereum', 'Ethereum is a decentralized platform that runs smart contracts', 'https://ethereum.org', 'https://assets.coingecko.com/coins/images/279/large/ethereum.png', 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png'),
('019a027e-d7f3-7444-9b8b-731d87a05de1', 'USDC', 'USD Coin', 'USDC is a fully collateralized US dollar stablecoin', 'https://www.circle.com/en/usdc', 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png', 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png', 'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png'),
('019a027e-d7fe-7444-9b8b-7be9e41e64e1', 'USDT', 'Tether', 'Tether is a stablecoin pegged to the US Dollar', 'https://tether.to', 'https://assets.coingecko.com/coins/images/325/large/Tether.png', 'https://assets.coingecko.com/coins/images/325/small/Tether.png', 'https://assets.coingecko.com/coins/images/325/thumb/Tether.png'),
('019a027e-d809-7444-9b8b-83ccaddd5b49', 'WBTC', 'Wrapped Bitcoin', 'Wrapped Bitcoin brings Bitcoin to Ethereum', 'https://wbtc.network', 'https://assets.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png', 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png', 'https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png'),
('019a027e-d815-7444-9b8b-8ad02cbab81d', 'DAI', 'Dai Stablecoin', 'DAI is a decentralized stablecoin soft-pegged to the US Dollar', 'https://makerdao.com', 'https://assets.coingecko.com/coins/images/9956/large/Badge_Dai.png', 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png', 'https://assets.coingecko.com/coins/images/9956/thumb/Badge_Dai.png'),
('019a027e-d820-7444-9b8b-9101d5cc6f00', 'MATIC', 'Polygon', 'MATIC is the native token of Polygon', 'https://polygon.technology', 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png', 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png', 'https://assets.coingecko.com/coins/images/4713/thumb/matic-token-icon.png'),
('019a027e-d82b-7444-9b8b-9dd08879861b', 'ARB', 'Arbitrum', 'ARB is the governance token of Arbitrum', 'https://arbitrum.io', 'https://assets.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg', 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg', 'https://assets.coingecko.com/coins/images/16547/thumb/photo_2023-03-29_21.47.00.jpeg'),
('019a027e-d836-7444-9b8b-a5f9bedc4000', 'OP', 'Optimism', 'OP is the governance token of Optimism', 'https://optimism.io', 'https://assets.coingecko.com/coins/images/25244/large/Optimism.png', 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png', 'https://assets.coingecko.com/coins/images/25244/thumb/Optimism.png'),
('019a027e-d841-7444-9b8b-aec61f68b20d', 'AVAX', 'Avalanche', 'AVAX is the native token of Avalanche', 'https://www.avax.network', 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png', 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png', 'https://assets.coingecko.com/coins/images/12559/thumb/Avalanche_Circle_RedWhite_Trans.png'),
('019a027e-d84c-7444-9b8b-b0cd2e9541fa', 'BNB', 'BNB', 'BNB is the native token of BNB Chain', 'https://www.bnbchain.org', 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png', 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', 'https://assets.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png'),
('019a027e-d858-7444-9b8b-bb6ccedd2a73', 'LINK', 'Chainlink', 'Chainlink is a decentralized oracle network', 'https://chain.link', 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png', 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png', 'https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png'),
('019a0280-0841-755e-9fc2-9f715ee14b3b', 'UNI', 'Uniswap', 'UNI is the governance token of Uniswap', 'https://uniswap.org', 'https://assets.coingecko.com/coins/images/12504/large/uni.jpg', 'https://assets.coingecko.com/coins/images/12504/small/uni.jpg', 'https://assets.coingecko.com/coins/images/12504/thumb/uni.jpg'),
('019a0280-084d-755e-9fc2-a12b3b1b8323', 'BTC', 'Bitcoin', 'Bitcoin is a decentralized digital currency', 'https://bitcoin.org', 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png', 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', 'https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png'),
('019a0280-0857-755e-9fc2-ac8606cedd84', 'SOL', 'Solana', 'Solana is a high-performance blockchain supporting builders around the world', 'https://solana.com', 'https://assets.coingecko.com/coins/images/4128/large/solana.png', 'https://assets.coingecko.com/coins/images/4128/small/solana.png', 'https://assets.coingecko.com/coins/images/4128/thumb/solana.png'),
('019a0280-0862-755e-9fc2-b771f3b64b8d', 'RAY', 'Raydium', 'Raydium is an automated market maker on Solana', 'https://raydium.io', 'https://assets.coingecko.com/coins/images/13928/large/PSigc4ie_400x400.jpg', 'https://assets.coingecko.com/coins/images/13928/small/PSigc4ie_400x400.jpg', 'https://assets.coingecko.com/coins/images/13928/thumb/PSigc4ie_400x400.jpg'),
('019a0280-086e-755e-9fc2-bb5530ed8b91', 'ORCA', 'Orca', 'Orca is the easiest DEX on Solana', 'https://www.orca.so', 'https://assets.coingecko.com/coins/images/17547/large/orca.png', 'https://assets.coingecko.com/coins/images/17547/small/orca.png', 'https://assets.coingecko.com/coins/images/17547/thumb/orca.png'),
('019a0280-0879-755e-9fc2-c5c621dfbb27', 'JUP', 'Jupiter', 'Jupiter is the key liquidity aggregator for Solana', 'https://jup.ag', 'https://assets.coingecko.com/coins/images/10351/large/logo512.png', 'https://assets.coingecko.com/coins/images/10351/small/logo512.png', 'https://assets.coingecko.com/coins/images/10351/thumb/logo512.png'),
('019a0280-0884-755e-9fc2-cdc9b940a85a', 'BONK', 'Bonk', 'BONK is a Solana-based memecoin', 'https://bonkcoin.com', 'https://assets.coingecko.com/coins/images/28600/large/bonk.jpg', 'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg', 'https://assets.coingecko.com/coins/images/28600/thumb/bonk.jpg'),
('019a0280-088f-755e-9fc2-d007355622c4', 'JTO', 'Jito', 'Jito is a MEV-focused protocol on Solana', 'https://www.jito.network', 'https://assets.coingecko.com/coins/images/33279/large/jito.png', 'https://assets.coingecko.com/coins/images/33279/small/jito.png', 'https://assets.coingecko.com/coins/images/33279/thumb/jito.png');

-- Insert chain_tokens (tokens on each chain)
-- Using decode() to convert hex addresses to bytea

-- Ethereum tokens
INSERT INTO chain_tokens (token_id, chain_id, address, decimals, is_native, current_price, priority) VALUES
('019a027e-d7e9-7444-9b8b-6b009cdc9af5', '019a027e-d779-7444-9b8b-23779e6550d7', decode('0000000000000000000000000000000000000000', 'hex'), 18, true, 250000000000, 100),
('019a027e-d7f3-7444-9b8b-731d87a05de1', '019a027e-d779-7444-9b8b-23779e6550d7', decode('a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'hex'), 6, false, 100000000, 90),
('019a027e-d7fe-7444-9b8b-7be9e41e64e1', '019a027e-d779-7444-9b8b-23779e6550d7', decode('dac17f958d2ee523a2206206994597c13d831ec7', 'hex'), 6, false, 100000000, 85),
('019a027e-d809-7444-9b8b-83ccaddd5b49', '019a027e-d779-7444-9b8b-23779e6550d7', decode('2260fac5e5542a773aa44fbcfedf7c193bc2c599', 'hex'), 8, false, 6000000000000, 80),
('019a027e-d815-7444-9b8b-8ad02cbab81d', '019a027e-d779-7444-9b8b-23779e6550d7', decode('6b175474e89094c44da98b954eedeac495271d0f', 'hex'), 18, false, 100000000, 75),
('019a027e-d858-7444-9b8b-bb6ccedd2a73', '019a027e-d779-7444-9b8b-23779e6550d7', decode('514910771af9ca656af840dff83e8264ecf986ca', 'hex'), 18, false, 1500000000, 70),
('019a0280-0841-755e-9fc2-9f715ee14b3b', '019a027e-d779-7444-9b8b-23779e6550d7', decode('1f9840a85d5af5bf1d1762f925bdaddc4201f984', 'hex'), 18, false, 800000000, 65);

-- Polygon tokens
INSERT INTO chain_tokens (token_id, chain_id, address, decimals, is_native, current_price, priority) VALUES
('019a027e-d820-7444-9b8b-9101d5cc6f00', '019a027e-d78f-7444-9b8b-2e080cff6977', decode('0000000000000000000000000000000000000000', 'hex'), 18, true, 80000000, 100),
('019a027e-d7f3-7444-9b8b-731d87a05de1', '019a027e-d78f-7444-9b8b-2e080cff6977', decode('3c499c542cef5e3811e1192ce70d8cc03d5c3359', 'hex'), 6, false, 100000000, 90),
('019a027e-d7fe-7444-9b8b-7be9e41e64e1', '019a027e-d78f-7444-9b8b-2e080cff6977', decode('c2132d05d31c914a87c6611c10748aeb04b58e8f', 'hex'), 6, false, 100000000, 85),
('019a027e-d809-7444-9b8b-83ccaddd5b49', '019a027e-d78f-7444-9b8b-2e080cff6977', decode('1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', 'hex'), 8, false, 6000000000000, 80),
('019a027e-d815-7444-9b8b-8ad02cbab81d', '019a027e-d78f-7444-9b8b-2e080cff6977', decode('8f3cf7ad23cd3cadbd9735aff958023239c6a063', 'hex'), 18, false, 100000000, 75);

-- Arbitrum tokens
INSERT INTO chain_tokens (token_id, chain_id, address, decimals, is_native, current_price, priority) VALUES
('019a027e-d7e9-7444-9b8b-6b009cdc9af5', '019a027e-d79a-7444-9b8b-307d7ed7a437', decode('0000000000000000000000000000000000000000', 'hex'), 18, true, 250000000000, 100),
('019a027e-d82b-7444-9b8b-9dd08879861b', '019a027e-d79a-7444-9b8b-307d7ed7a437', decode('912ce59144191c1204e64559fe8253a0e49e6548', 'hex'), 18, false, 75000000, 95),
('019a027e-d7f3-7444-9b8b-731d87a05de1', '019a027e-d79a-7444-9b8b-307d7ed7a437', decode('af88d065e77c8cc2239327c5edb3a432268e5831', 'hex'), 6, false, 100000000, 90),
('019a027e-d7fe-7444-9b8b-7be9e41e64e1', '019a027e-d79a-7444-9b8b-307d7ed7a437', decode('fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', 'hex'), 6, false, 100000000, 85),
('019a027e-d809-7444-9b8b-83ccaddd5b49', '019a027e-d79a-7444-9b8b-307d7ed7a437', decode('2f2a2543b76a4166549f7aab2e75bef0aefc5b0f', 'hex'), 8, false, 6000000000000, 80);

-- Optimism tokens
INSERT INTO chain_tokens (token_id, chain_id, address, decimals, is_native, current_price, priority) VALUES
('019a027e-d7e9-7444-9b8b-6b009cdc9af5', '019a027e-d7a6-7444-9b8b-3b9ef9d7c9f6', decode('0000000000000000000000000000000000000000', 'hex'), 18, true, 250000000000, 100),
('019a027e-d836-7444-9b8b-a5f9bedc4000', '019a027e-d7a6-7444-9b8b-3b9ef9d7c9f6', decode('4200000000000000000000000000000000000042', 'hex'), 18, false, 180000000, 95),
('019a027e-d7f3-7444-9b8b-731d87a05de1', '019a027e-d7a6-7444-9b8b-3b9ef9d7c9f6', decode('0b2c639c533813f4aa9d7837caf62653d097ff85', 'hex'), 6, false, 100000000, 90),
('019a027e-d7fe-7444-9b8b-7be9e41e64e1', '019a027e-d7a6-7444-9b8b-3b9ef9d7c9f6', decode('94b008aa00579c1307b0ef2c499ad98a8ce58e58', 'hex'), 6, false, 100000000, 85),
('019a027e-d815-7444-9b8b-8ad02cbab81d', '019a027e-d7a6-7444-9b8b-3b9ef9d7c9f6', decode('da10009cbd5d07dd0cecc66161fc93d7c9000da1', 'hex'), 18, false, 100000000, 75);

-- Base tokens
INSERT INTO chain_tokens (token_id, chain_id, address, decimals, is_native, current_price, priority) VALUES
('019a027e-d7e9-7444-9b8b-6b009cdc9af5', '019a027e-d7b0-7444-9b8b-40542f350726', decode('0000000000000000000000000000000000000000', 'hex'), 18, true, 250000000000, 100),
('019a027e-d7f3-7444-9b8b-731d87a05de1', '019a027e-d7b0-7444-9b8b-40542f350726', decode('833589fcd6edb6e08f4c7c32d4f71b54bda02913', 'hex'), 6, false, 100000000, 90),
('019a027e-d815-7444-9b8b-8ad02cbab81d', '019a027e-d7b0-7444-9b8b-40542f350726', decode('50c5725949a6f0c72e6c4a641f24049a917db0cb', 'hex'), 18, false, 100000000, 80);

-- Avalanche tokens
INSERT INTO chain_tokens (token_id, chain_id, address, decimals, is_native, current_price, priority) VALUES
('019a027e-d841-7444-9b8b-aec61f68b20d', '019a027e-d7bb-7444-9b8b-4b4a090fb280', decode('0000000000000000000000000000000000000000', 'hex'), 18, true, 3500000000, 100),
('019a027e-d7f3-7444-9b8b-731d87a05de1', '019a027e-d7bb-7444-9b8b-4b4a090fb280', decode('b97ef9ef8734c71904d8002f8b6bc66dd9c48a6e', 'hex'), 6, false, 100000000, 90),
('019a027e-d7fe-7444-9b8b-7be9e41e64e1', '019a027e-d7bb-7444-9b8b-4b4a090fb280', decode('9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7', 'hex'), 6, false, 100000000, 85),
('019a027e-d809-7444-9b8b-83ccaddd5b49', '019a027e-d7bb-7444-9b8b-4b4a090fb280', decode('50b7545627a5162f82a992c33b87adc75187b218', 'hex'), 8, false, 6000000000000, 80);

-- BNB Chain tokens
INSERT INTO chain_tokens (token_id, chain_id, address, decimals, is_native, current_price, priority) VALUES
('019a027e-d84c-7444-9b8b-b0cd2e9541fa', '019a027e-d7c7-7444-9b8b-54ce2cab0ea1', decode('0000000000000000000000000000000000000000', 'hex'), 18, true, 60000000000, 100),
('019a027e-d7f3-7444-9b8b-731d87a05de1', '019a027e-d7c7-7444-9b8b-54ce2cab0ea1', decode('8ac76a51cc950d9822d68b83fe1ad97b32cd580d', 'hex'), 18, false, 100000000, 90),
('019a027e-d7fe-7444-9b8b-7be9e41e64e1', '019a027e-d7c7-7444-9b8b-54ce2cab0ea1', decode('55d398326f99059ff775485246999027b3197955', 'hex'), 18, false, 100000000, 85),
('019a027e-d7e9-7444-9b8b-6b009cdc9af5', '019a027e-d7c7-7444-9b8b-54ce2cab0ea1', decode('2170ed0880ac9a755fd29b2688956bd959f933f8', 'hex'), 18, false, 250000000000, 80),
('019a027e-d815-7444-9b8b-8ad02cbab81d', '019a027e-d7c7-7444-9b8b-54ce2cab0ea1', decode('1af3f329e8be154074d8769d1ffa4ee058b1dbc3', 'hex'), 18, false, 100000000, 75);

-- Bitcoin tokens (native BTC only)
INSERT INTO chain_tokens (token_id, chain_id, address, decimals, is_native, current_price, priority) VALUES
('019a0280-084d-755e-9fc2-a12b3b1b8323', '019a027e-d7d2-7444-9b8b-5c7396eff0e7', decode('0000000000000000000000000000000000000000', 'hex'), 8, true, 9500000000000, 100);

-- Solana tokens
-- Note: Solana uses 32-byte public keys encoded in base58. Addresses below are converted to hex.
-- SOL native: 11111111111111111111111111111111 (System Program)
-- USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
-- USDT: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
-- RAY: 4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R
-- ORCA: orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE
-- JUP: JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN
-- BONK: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
-- JTO: jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL
INSERT INTO chain_tokens (token_id, chain_id, address, decimals, is_native, current_price, priority) VALUES
('019a0280-0857-755e-9fc2-ac8606cedd84', '019a027e-d7dd-7444-9b8b-6543f6bc7056', decode('0000000000000000000000000000000000000000000000000000000000000000', 'hex'), 9, true, 15000000000, 100),
('019a027e-d7f3-7444-9b8b-731d87a05de1', '019a027e-d7dd-7444-9b8b-6543f6bc7056', decode('c6fa7af3bedbad3a3d65f36aabc97431b1bbe4c2d2f6e0e47ca60203452f5d61', 'hex'), 6, false, 100000000, 95),
('019a027e-d7fe-7444-9b8b-7be9e41e64e1', '019a027e-d7dd-7444-9b8b-6543f6bc7056', decode('ce010e60afedb22717bd63192f54145a3f965a33bb82d2c7029eb2ce1e208264', 'hex'), 6, false, 100000000, 90),
('019a0280-0862-755e-9fc2-b771f3b64b8d', '019a027e-d7dd-7444-9b8b-6543f6bc7056', decode('37998ccbf2d0458b615cbcc6b1a367c4749e9fef7306622e1b1b58910120bc9a', 'hex'), 6, false, 200000000, 85),
('019a0280-086e-755e-9fc2-bb5530ed8b91', '019a027e-d7dd-7444-9b8b-6543f6bc7056', decode('0c00d0afeb8614da7f19aba02d40f18c692585f65020dfced3d5e5f9a9c0c4e1', 'hex'), 6, false, 350000000, 80),
('019a0280-0879-755e-9fc2-c5c621dfbb27', '019a027e-d7dd-7444-9b8b-6543f6bc7056', decode('0479d9c7cc1035de7211f99eb48c09d70b2bdf5bdf9e2e56b8a1fbb5a2ea3327', 'hex'), 6, false, 90000000, 75),
('019a0280-0884-755e-9fc2-cdc9b940a85a', '019a027e-d7dd-7444-9b8b-6543f6bc7056', decode('bc07c56e60ad3d3f177382eac6548fba1fd32cfd90ca02b3e7cfa185fdce7398', 'hex'), 5, false, 3000, 70),
('019a0280-088f-755e-9fc2-d007355622c4', '019a027e-d7dd-7444-9b8b-6543f6bc7056', decode('0afcf8968b8dab88481e2d2ae689c952c757aeba643e3919e89f2e55795c76c1', 'hex'), 9, false, 280000000, 65);