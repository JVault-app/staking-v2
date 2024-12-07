import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, DictionaryValue, Sender, SendMode } from '@ton/core';
import { UserRewardsDictValue, userRewardsDictValueParser } from './StakeWallet';
import { AddrList, Gas, OpCodes } from './imports/constants';
import { sign, KeyPair } from '@ton/crypto';

export type ReferrerWalletPoolDictValue = {
    inviteesBalance: bigint;
    hasPendingRequest: boolean;
    pendingChange: bigint;
    rewardsDict: Dictionary<Address, UserRewardsDictValue>;
}

export function referrerWalletPoolDictValueParser(): DictionaryValue<ReferrerWalletPoolDictValue> {
    return {
        serialize: (src, buidler) => {
            buidler.storeCoins(src.inviteesBalance).storeBit(src.hasPendingRequest).storeInt(src.pendingChange, 121).storeDict(src.rewardsDict, Dictionary.Keys.Address(), userRewardsDictValueParser()).endCell();
        },
        parse: (src) => {
            return {inviteesBalance: src.loadCoins(), hasPendingRequest: src.loadBit(), pendingChange: src.loadIntBig(121), rewardsDict: src.loadDict(Dictionary.Keys.Address(), userRewardsDictValueParser())};
        }
    }
}

export function rewardsRequestDictValueParser(): DictionaryValue<AddrList> {
    return {
        serialize: (src, buidler) => {
            buidler.storeDict(src, Dictionary.Keys.Address(), Dictionary.Values.Bool()).endCell();
        },
        parse: (src) => {
            return src.loadDict(Dictionary.Keys.Address(), Dictionary.Values.Bool());
        }
    }
}

export type ReferrerWalletConfig = {
    ownerAddress: Address;
    revenueShare: number;
    poolsDict?: Dictionary<number, ReferrerWalletPoolDictValue>;
    inviteeWalletCode: Cell;
};

export function referrerWalletConfigToCell(config: ReferrerWalletConfig): Cell {
    return beginCell()
            .storeAddress(config.ownerAddress)
            .storeUint(config.revenueShare, 16)
            .storeDict(config.poolsDict, Dictionary.Keys.Uint(32), referrerWalletPoolDictValueParser())
            .storeRef(config.inviteeWalletCode)
        .endCell();
}

export class ReferrerWallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new ReferrerWallet(address);
    }

    static createFromConfig(config: ReferrerWalletConfig, code: Cell, workchain = 0) {
        const data = referrerWalletConfigToCell(config);
        const init = { code, data };
        return new ReferrerWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint, referrerAddress: Address, revenueShare: number, inviteeWalletCode: Cell, privateKey: Buffer) {
        let msgBody = beginCell()
                        .storeAddress(referrerAddress)
                        .storeUint(revenueShare, 16)
                        .storeRef(inviteeWalletCode);
        let signature = sign(msgBody.endCell().hash(), privateKey);
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                    .storeUint(OpCodes.SET_DATA, 32)
                    .storeUint(0, 64)
                    .storeBuilder(msgBody)
                    .storeRef(beginCell().storeBuffer(signature).endCell())
                .endCell(),
        });
    }

    async sendClaimRewards(provider: ContractProvider, via: Sender, value: bigint, rewardsToClaim: Dictionary<number, AddrList>, queryId?: number) {
        let requiredGas = 0n;
        for (let poolId of rewardsToClaim.keys()) {
            requiredGas += BigInt(rewardsToClaim.get(poolId)!!.size) * Gas.JETTON_TRANSFER + Gas.SIMPLE_UPDATE_REQUEST;
        }
        await provider.internal(via, {
            value: requiredGas,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                    .storeUint(OpCodes.CLAIM_REWARDS, 32)
                    .storeUint(queryId ?? 0, 64)
                    .storeDict(rewardsToClaim, Dictionary.Keys.Uint(32), rewardsRequestDictValueParser())
                .endCell()
        });
    }

    async getStorageData(provider: ContractProvider): Promise<ReferrerWalletConfig> {
        const {stack} = await provider.get('get_storage_data', []);
        return {
            ownerAddress: stack.readAddress(),
            revenueShare: stack.readNumber(),
            poolsDict: stack.readCellOpt()?.asSlice().loadDictDirect(Dictionary.Keys.Uint(32), referrerWalletPoolDictValueParser()),
            inviteeWalletCode: stack.readCell(),
        };
    }
}
