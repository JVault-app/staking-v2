import { toNano } from '@ton/core';
import { PoolFactory } from '../wrappers/PoolFactory';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const poolFactory = provider.open(PoolFactory.createFromConfig({}, await compile('PoolFactory')));

    await poolFactory.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(poolFactory.address);

    // run methods on `poolFactory`
}
