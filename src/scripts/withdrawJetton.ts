import { Address, beginCell, Cell, Dictionary, toNano } from '@ton/core';
import { PeriodsDeployValue, PoolFactory, PoolFactoryConfig } from '../wrappers/PoolFactory';
import { compile, NetworkProvider } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { Dividers, Gas } from '../wrappers/imports/constants';
import { LockPeriodsValue, StakingPool, StakingPoolConfig } from '../wrappers/StakingPool';
import { JettonMinter } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { buildOnchainMetadata } from '../wrappers/imports/buildOnchain';


export async function run(provider: NetworkProvider) {
    let ton_gains = 26.2 + 21 + 8 + 2.3 + 100.5 - 71.15 + 9.28 + 15 + 6.27 + 20.7 + 3.7 + 19.1 + 34 + 33 - 18 + 99 + 54.7 - 77.1 + 60 + 29.9 + 24.7 - 10.15 + 99 + 8 + 24.8 + 55;
    let usdt_gains = 380 + 93.4 + 49.26 - 15 + 33.4;
    let ton_spends_dan = 25 + 31 + 10 + 14 + 64 + 48.5 + 7 + 2 + 221 + 67 +130;
    let ton_spends_dima = 31;
    const poolFactory = provider.open(PoolFactory.createFromAddress(Address.parse("EQAYS3AO2NaFr5-wl1CU8QMiCxrP0OEXYn82iqnuST9FKo9I")));
    const stakingPool = provider.open(StakingPool.createFromAddress(Address.parse("EQAuECBjjC_OOwElCItx8vLEIZkGcWgAIFWBRvrDa91WWWT3")));
    // await poolFactory.sendWithdrawJetton(provider.sender(), Address.parse("EQBNERFoKs_EAVezGyETz9YuebZgt-esRbAvByKcl0s-FR7j"), 1853940000000n);
    await poolFactory.sendWithdrawJetton(provider.sender(), Address.parse("EQBNERFoKs_EAVezGyETz9YuebZgt-esRbAvByKcl0s-FR7j"), 2225750000000n);
    // await poolFactory.sendSendWithdrawJettons(provider.sender(), stakingPool.address, Address.parse("EQCLFQDYyOAm-W6wSe_oDAuHrX2WBjd5FfEU82QZxiHcDtEA"), 10n ** 15n - 10n ** 9n);
}