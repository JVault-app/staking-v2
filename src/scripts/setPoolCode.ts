import { Address, beginCell, Cell, Dictionary, toNano } from '@ton/core';
import { PeriodsDeployValue, PoolFactory, PoolFactoryConfig } from '../wrappers/PoolFactory';
import { compile, NetworkProvider } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { Dividers, Gas } from '../wrappers/imports/constants';
import { LockPeriodsValue, StakingPool, StakingPoolConfig, stakingPoolInitedData } from '../wrappers/StakingPool';
import { JettonMinter } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { buildOnchainMetadata } from '../wrappers/imports/buildOnchain';


export async function run(provider: NetworkProvider) {
    const poolFactory = provider.open(PoolFactory.createFromAddress(Address.parse("EQDbVcYqi4vPL_h37o4p-syYSIridQzotg_asck57ziU1ClS")));
    const stakingPool = provider.open(StakingPool.createFromAddress(Address.parse("kQBGhrw6itFreosqmxziPOsL8DRzcvu3Ttm-e-3OdSIMrFn0")));
    let stakingPoolConfig = await stakingPool.getStorageData();
    stakingPoolConfig.maxDeposit = 150000n * (10n ** 9n)
    await poolFactory.sendSendSetCode(provider.sender(), stakingPool.address, await compile("StakingPool"), stakingPoolInitedData(stakingPoolConfig));
}