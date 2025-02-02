import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, DictionaryValue, Sender, SendMode, toNano } from '@ton/core';
import { UserRewardsDictValue, userRewardsDictValueParser } from './StakeWallet';
import { AddrList, Gas, OpCodes } from './imports/constants';
import { sign, KeyPair } from '@ton/crypto';

export type ReferrerWalletPoolDictValue = {
    inviteesBalance: bigint;
    hasPendingRequest: boolean;
    pendingChange: bigint;
    rewardsDict: Dictionary<Address, UserRewardsDictValue>;
}

export type RewardsRequestDictValue = {
    coinsToSend: bigint;
    jettonWallets: AddrList;
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

export function rewardsRequestDictValueParser(): DictionaryValue<RewardsRequestDictValue> {
    return {
        serialize: (src, buidler) => {
            buidler.storeCoins(src.coinsToSend).storeDict(src.jettonWallets, Dictionary.Keys.Address(), Dictionary.Values.Bool()).endCell();
        },
        parse: (src) => {
            return {coinsToSend: src.loadCoins(), jettonWallets: src.loadDict(Dictionary.Keys.Address(), Dictionary.Values.Bool())};
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

    async sendDeploy(provider: ContractProvider, via: Sender, referrerAddress: Address, revenueShare: number, inviteeWalletCode: Cell, privateKey: Buffer) {
        let msgBody = beginCell()
                        .storeAddress(referrerAddress)
                        .storeUint(revenueShare, 16)
                        .storeRef(inviteeWalletCode);
        let signature = sign(msgBody.endCell().hash(), privateKey);
        await provider.internal(via, {
            value: toNano('0.15'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                    .storeUint(OpCodes.SET_DATA, 32)
                    .storeUint(0, 64)
                    .storeRef(beginCell().storeBuffer(signature).endCell())
                    .storeBuilder(msgBody)
                .endCell(),
        });
    }

    async sendClaimRewards(provider: ContractProvider, via: Sender, rewardsToClaim: Dictionary<number, AddrList>, queryId?: number) {
        let requiredGas = toNano('0.1');
        let tmp = Dictionary.empty(Dictionary.Keys.Uint(32), rewardsRequestDictValueParser());
        for (let poolId of rewardsToClaim.keys()) {
            let jettonWallets = rewardsToClaim.get(poolId)!!;
            let coinsToSend = BigInt(jettonWallets.size) * Gas.JETTON_TRANSFER + Gas.SIMPLE_UPDATE_REQUEST;
            tmp.set(poolId, {coinsToSend, jettonWallets});
            requiredGas += coinsToSend;
        }
        await provider.internal(via, {
            value: requiredGas,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                    .storeUint(OpCodes.CLAIM_REWARDS, 32)
                    .storeUint(queryId ?? 0, 64)
                    .storeDict(tmp, Dictionary.Keys.Uint(32), rewardsRequestDictValueParser())
                .endCell()
        });
    }

    async sendUpgradeReferrerWallet(provider: ContractProvider, via: Sender, newRevenueShare: number, ownerAddress: Address, signTime: number, privateKey: Buffer, queryId?: number) {
        let msgBody = beginCell()
                        .storeAddress(ownerAddress)
                        .storeUint(signTime, 32)
                        .storeUint(newRevenueShare, 16);
        let signature = sign(msgBody.endCell().hash(), privateKey);
        await provider.internal(via, {
            value: toNano('0.2'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                    .storeUint(OpCodes.UPGRADE_REFERRER_WALLET, 32)
                    .storeUint(queryId ?? 0, 64)
                    .storeRef(beginCell().storeBuffer(signature).endCell())
                    .storeBuilder(msgBody)
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
