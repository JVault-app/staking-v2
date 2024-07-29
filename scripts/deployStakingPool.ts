import { toNano } from '@ton/core';
import { StakingPool } from '../wrappers/StakingPool';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const stakingPool = provider.open(StakingPool.createFromConfig({}, await compile('StakingPool')));

    await stakingPool.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(stakingPool.address);

    // run methods on `stakingPool`
}
