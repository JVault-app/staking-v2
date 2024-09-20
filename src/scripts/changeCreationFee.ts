import { Address, beginCell, Cell, Dictionary, toNano, TupleReader } from '@ton/core';
import { PeriodsDeployValue, PoolFactory, PoolFactoryConfig } from '../wrappers/PoolFactory';
import { compile, NetworkProvider } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { Dividers, Gas } from '../wrappers/imports/constants';
import { LockPeriodsValue, StakingPool, StakingPoolConfig } from '../wrappers/StakingPool';
import { JettonMinter } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { buildOnchainMetadata } from '../wrappers/imports/buildOnchain';
import { StakeWalletConfig, userRewardsDictValueParser } from '../wrappers/StakeWallet';

function parseStack(stack: TupleReader) {
    let res: any = { 
        stakingPoolAddress: stack.readAddress(),
        ownerAddress: stack.readAddress(),
        lockPeriod: stack.readBigNumber(),
        jettonBalance: stack.readBigNumber(),
        rewardsDict: stack.readCellOpt(),
        unstakeRequests: stack.readCellOpt(),
        requestsCount: stack.readBigNumber(),
        totalRequestedJettons: stack.readBigNumber(),
        isActive: stack.readBoolean(),
        unstakeCommission: stack.readBigNumber(),
        unstakeFee: stack.readBigNumber(),
        minDeposit: stack.readBigNumber(),
        maxDeposit: stack.readBigNumber(),
        whitelist: stack.readCellOpt(),
        minterAddress: stack.readAddress()
    }
    
    // if (res.rewardsDict) {
    //     res.rewardsDict = res.rewardsDict.beginParse().loadDictDirect(Dictionary.Keys.Address(), userRewardsDictValueParser());  
    // }
    // if (res.unstakeRequests) {
    //     res.unstakeRequests = res.unstakeRequests.beginParse().loadDictDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigVarUint(16));
    // }
    // if (res.whitelist) {
    //     res.whitelist = res.whitelist.beginParse().loadDictDirect(Dictionary.Keys.Address(), Dictionary.Values.Bool());
    // }
    let k: StakeWalletConfig = res;
    return k;
}
export async function run(provider: NetworkProvider) {
    console.log(parseStack((await provider.api().runMethod(40445383, Address.parse("EQCdpzoFTnPKgo2VhmbNmxq521iWMZt5kTb4OSRoqJccPW-d"), 'get_storage_data')).reader))
    console.log(parseStack((await provider.api().runMethod(40446198, Address.parse("EQCdpzoFTnPKgo2VhmbNmxq521iWMZt5kTb4OSRoqJccPW-d"), 'get_storage_data')).reader))
    
    // const poolFactory = provider.open(PoolFactory.createFromAddress(Address.parse("EQAYS3AO2NaFr5-wl1CU8QMiCxrP0OEXYn82iqnuST9FKo9I")));
    // await poolFactory.sendChangeCreationFee(provider.sender(), toNano("50"));
}