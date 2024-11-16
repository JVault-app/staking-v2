import { Address, beginCell, Cell, Dictionary, toNano } from '@ton/core';
import { PeriodsDeployValue, PoolFactory, PoolFactoryConfig, poolFactoryConfigToCell } from '../wrappers/PoolFactory';
import { compile, NetworkProvider } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { Dividers, Gas } from '../wrappers/imports/constants';
import { LockPeriodsValue, StakingPool, StakingPoolConfig } from '../wrappers/StakingPool';
import { JettonMinter } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { buildOnchainMetadata } from '../wrappers/imports/buildOnchain';


export async function run(provider: NetworkProvider) {
    const poolFactory = provider.open(PoolFactory.createFromAddress(Address.parse("EQAYS3AO2NaFr5-wl1CU8QMiCxrP0OEXYn82iqnuST9FKo9I")));
    let factoryConfig = await poolFactory.getStorageData();
    factoryConfig.ownerAddress = Address.parse("UQAPAyUbcOv-r3XTKoAma309Km5RSxkb08zz999OYJl4T_7D");
    factoryConfig.version += 1n;
    let x = poolFactoryConfigToCell(factoryConfig).beginParse();
    let next_pool_id = x.loadUint(32);
    let collection_content = x.loadMaybeRef();

    let min_rewards_commission = x.loadUint(16);
    let unstake_fee = x.loadCoins();
    let fees_wallet_address = x.loadAddress();
    let creation_fee = x.loadCoins();

    let ds2 = x.loadRef().beginParse(); 
    x.endParse();
    
    let admin_address = ds2.loadAddress();
    let owner_address = ds2.loadAddress();
    let pool_uninited_codes = ds2.loadMaybeRef();
    let pool_inited_code = ds2.loadRef();
    let stake_wallet_code = ds2.loadRef();
    let jetton_minter_code = ds2.loadRef();
    let version = ds2.loadUint(16);

    await poolFactory.sendSetCode(provider.sender(), await compile("PoolFactory"), poolFactoryConfigToCell(factoryConfig));
    // await poolFactory.sendChangeCodes(provider.sender(), await compile("StakingPool"), await compile("StakeWallet"), await compile("JettonMinter"));
}