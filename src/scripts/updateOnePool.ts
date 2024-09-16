import { Address, beginCell, Cell, Dictionary, toNano } from '@ton/core';
import { PeriodsDeployValue, PoolFactory, PoolFactoryConfig } from '../wrappers/PoolFactory';
import { compile, NetworkProvider } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { Dividers, Gas } from '../wrappers/imports/constants';
import { LockPeriodsValue, StakingPool, StakingPoolConfig, stakingPoolConfigToCell, stakingPoolInitedData } from '../wrappers/StakingPool';
import { JettonMinter } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { buildOnchainMetadata } from '../wrappers/imports/buildOnchain';


export async function run(provider: NetworkProvider) {
    const poolFactory = provider.open(PoolFactory.createFromAddress(Address.parse("EQAYS3AO2NaFr5-wl1CU8QMiCxrP0OEXYn82iqnuST9FKo9I")));
    const stakingPool = provider.open(StakingPool.createFromAddress(Address.parse("EQCiLpX9GzpcVf0rxXTBwMDp3wQdb2ThOk-rrJ75tLYsbRKZ")));
    let stakingPoolConfig = await stakingPool.getStorageData();
    stakingPoolConfig.creatorAddress = Address.parse("UQDDTZbtGRu1C7IaFFOY_jvR-CqHmvzkC1ngKwJ4YvbtZZEV")
    stakingPoolConfig.rewardsCommission /= 4n;
    let tmp = await stakingPool.getData();
    stakingPoolConfig.content = tmp.content;
    await poolFactory.sendSendSetCode(provider.sender(), stakingPool.address, await compile("StakingPool"), stakingPoolInitedData(stakingPoolConfig)); //stakingPoolInitedData(stakingPoolConfig));
}