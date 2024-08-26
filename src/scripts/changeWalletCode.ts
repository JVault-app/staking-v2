import { Address, beginCell, Cell, Dictionary, toNano } from '@ton/core';
import { PeriodsDeployValue, PoolFactory, PoolFactoryConfig } from '../wrappers/PoolFactory';
import { compile, NetworkProvider } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { Dividers, Gas } from '../wrappers/imports/constants';
import { LockPeriodsValue, StakingPool, StakingPoolConfig, stakingPoolInitedData } from '../wrappers/StakingPool';
import { JettonMinter } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { buildOnchainMetadata } from '../wrappers/imports/buildOnchain';
import { StakeWallet, stakeWalletInitData } from '../wrappers/StakeWallet';


export async function run(provider: NetworkProvider) {
    const poolFactory = provider.open(PoolFactory.createFromAddress(Address.parse("EQAYS3AO2NaFr5-wl1CU8QMiCxrP0OEXYn82iqnuST9FKo9I")));
    const stakingPool = provider.open(StakingPool.createFromAddress(Address.parse("EQCqXC2ctGm-y4dDEseavJ2mwuZMksEI_jGi8msA2BNM19Br")));
    const stakeWalletAddress = (await stakingPool.getWalletAddress(Address.parse("0QB6ocEGor9tEFpCUehWZQO_VJHWMAV7BHg4u5E3RH-BotWe"), 3 * 60 * 60 * 24))!!;
    let stakeWallet = await provider.open(StakeWallet.createFromAddress(stakeWalletAddress));
    let stakeWalletConfig = await stakeWallet.getStorageData();
    await poolFactory.sendSendSendAnyMessage(provider.sender(), toNano('0.1'), stakingPool.address, stakeWalletAddress, StakingPool.setCodeMessage(await compile("MultisenderStakeWallet"), stakeWalletInitData(stakeWalletConfig, await compile("StakeWallet"))));
    // await poolFactory.sendSendSendAnyMessage(provider.sender(), toNano('0.1'), stakingPool.address, stakeWalletAddress, StakingPool.setCodeMessage(await compile("StakeWallet"), stakeWalletInitData(stakeWalletConfig)));
}