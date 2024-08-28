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
    const poolFactory = provider.open(PoolFactory.createFromAddress(Address.parse("EQAYS3AO2NaFr5-wl1CU8QMiCxrP0OEXYn82iqnuST9FKo9I")));
    const stakingPool = provider.open(StakingPool.createFromAddress(Address.parse("EQD0URjauE9D-5t8qUo-rn_l3158tWyxuzMuX-izFZ7b4QgT")));
    let stakingPoolConfig = await stakingPool.getStorageData();
    let tmp = await stakingPool.getData();
    stakingPoolConfig.content = tmp.content;
    // stakingPoolConfig.content = Cell.fromBase64("te6cckECDwEAAdUAAQMAwAECASACBwIBbgMFAUG/BBdbMdq9AAyXpTViM5RG+W/27c7Q33FHspDkX16Q+PYEAHgAaHR0cHM6Ly9qdmF1bHQueHl6L21lZGlhL3N0YWtpbmdfdjIvaW1hZ2VzL21haW5uZXRfSlZULndlYnABQb8Dl17aimzkvhQdv4Vyi8gU8VsIzhyjE4zyejdse6CfMgYAwgBodHRwczovL2p2YXVsdC54eXovc3Rha2luZy92Mi9wb29sX2NvbnRlbnQ/Zj1FUUFZUzNBTzJOYUZyNS13bDFDVThRTWlDeHJQME9FWFluODJpcW51U1Q5RktvOUkmaT0CASAICgFCv4KjU3/w285+7DXWntw6GJ7m8X2C81OlU/mqlssL486JCQAIAEpWVAIBIAsNAUG/Ugje9G9aHU+dzmarMJ9KhRMF8Wb5Hvedkj71jjT5ogkMAFgAVGhpcyBzdGFraW5nIHBvb2wgd2FzIGNyZWF0ZWQgb24gSlZhdWx0Lnh5egFBv3PQjuTKF1otRns6KKwqOz4EYfFAbrqTo/kBv1JelKETDgBiAEVRQzhGb1pNbEJjWmhaNlByOXNIR3lIemtGdjl5MkI1WDl0TjYxUnZ1Y0xSekZaekNwCUQ=")
    // let lockJettonMinter = provider.open(JettonMinter.createFromAddress(stakingPoolConfig.lockWalletAddress));
    // stakingPoolConfig.lockWalletAddress = await lockJettonMinter.getWalletAddress(stakingPool.address);
    // stakingPoolConfig.inited = true;
    // stakingPoolConfig.maxDeposit = 175000n * (10n ** 9n)
    await poolFactory.sendSendSetCode(provider.sender(), stakingPool.address, await compile("StakingPool"), stakingPoolInitedData(stakingPoolConfig));
}