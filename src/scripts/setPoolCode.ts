import { Address, beginCell, Cell, Dictionary, toNano, TupleBuilder } from '@ton/core';
import { PeriodsDeployValue, PoolFactory, PoolFactoryConfig } from '../wrappers/PoolFactory';
import { compile, NetworkProvider, sleep } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { Dividers, Gas } from '../wrappers/imports/constants';
import { LockPeriodsValue, StakingPool, StakingPoolConfig, stakingPoolInitedData } from '../wrappers/StakingPool';
import { JettonMinter } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { buildOnchainMetadata } from '../wrappers/imports/buildOnchain';
import { getSeqno } from './helpers';


export async function run(provider: NetworkProvider) {
    
    const poolFactory = provider.open(PoolFactory.createFromAddress(Address.parse("EQAYS3AO2NaFr5-wl1CU8QMiCxrP0OEXYn82iqnuST9FKo9I")));
    
    const excludedIndexes = [0, 3, 5, 6, 12]
    let curSeqno = await getSeqno(provider);

    for (let i = 4; i < 5; ++i) {
        if (excludedIndexes.includes(i)) {
            continue;
        }
        const poolAddress = await poolFactory.getNftAddressByIndex(i);
        const stakingPool = provider.open(StakingPool.createFromAddress(poolAddress));
        console.log(poolAddress)
        let stakingPoolConfig = await stakingPool.getStorageData();
        let tmp = await stakingPool.getData();
        stakingPoolConfig.content = tmp.content;
        await poolFactory.sendSendSetCode(provider.sender(), stakingPool.address, await compile("StakingPool"), null); //stakingPoolInitedData(stakingPoolConfig));
        while (curSeqno == await getSeqno(provider)) {
            await sleep(1000);
        }
        curSeqno = await getSeqno(provider);
        console.log(`transaction ${i} confirmed`)
    }
}