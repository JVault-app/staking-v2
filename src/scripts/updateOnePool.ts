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
    const stakingPool = provider.open(StakingPool.createFromAddress(Address.parse("EQACjwGpySkJJuugixehJQslfR57UMGH9haJ6nUbyVMSx1N2")));
    let stakingPoolConfig = await stakingPool.getStorageData();
    // stakingPoolConfig.tvl -= 10 ** 15n;
    let tmp2 = stakingPoolConfig.lockPeriods.get(259200)!!;
    tmp2.unstakeCommission = 10000 * 0.03;
    stakingPoolConfig.lockPeriods.set(259200, tmp2);

    tmp2 = stakingPoolConfig.lockPeriods.get(604800)!!;
    tmp2.unstakeCommission = 10000 * 0.04;
    stakingPoolConfig.lockPeriods.set(604800, tmp2);

    tmp2 = stakingPoolConfig.lockPeriods.get(1209600)!!;
    tmp2.unstakeCommission = 10000 * 0.05;
    stakingPoolConfig.lockPeriods.set(1209600, tmp2);

    tmp2 = stakingPoolConfig.lockPeriods.get(2592000)!!;
    tmp2.unstakeCommission = 10000 * 0.1;
    stakingPoolConfig.lockPeriods.set(2592000, tmp2);

    let tmp = await stakingPool.getData();
    stakingPoolConfig.content = tmp.content;
    await poolFactory.sendSendSetCode(provider.sender(), stakingPool.address, await compile("StakingPool"), stakingPoolInitedData(stakingPoolConfig)); //stakingPoolInitedData(stakingPoolConfig));
}