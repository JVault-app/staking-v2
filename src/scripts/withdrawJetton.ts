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
    
    const poolFactory = provider.open(PoolFactory.createFromAddress(Address.parse("EQAYS3AO2NaFr5-wl1CU8QMiCxrP0OEXYn82iqnuST9FKo9I")));
    const stakingPool = provider.open(StakingPool.createFromAddress(Address.parse("EQAuECBjjC_OOwElCItx8vLEIZkGcWgAIFWBRvrDa91WWWT3")));
    // await poolFactory.sendWithdrawJetton(provider.sender(), Address.parse("EQBNERFoKs_EAVezGyETz9YuebZgt-esRbAvByKcl0s-FR7j"), 1853940000000n);
    await poolFactory.sendWithdrawJetton(provider.sender(), Address.parse("EQClg7dmtPETKypYR1UAHvTMknvo_Tg2j0m2CInVCbZHf4rt"), 20000000000000n);
    // await poolFactory.sendSendWithdrawJettons(provider.sender(), stakingPool.address, Address.parse("EQCLFQDYyOAm-W6wSe_oDAuHrX2WBjd5FfEU82QZxiHcDtEA"), 10n ** 15n - 10n ** 9n);
}