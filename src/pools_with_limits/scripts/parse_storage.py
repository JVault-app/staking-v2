global_variables = """global slice storage::staking_pool_address;
global slice storage::owner_address;   
global int   storage::lock_period;              ;; Uint32. Time to wait for free withdrawal
            
global int   storage::jetton_balance;
global cell  storage::rewards_dict;                 ;; HashMapE. reward jetton address (MsgAddressStd) -> last_distributed_rewards (uint256), unclaimed_rewards (coins)

global cell  storage::unstake_requests;         ;; HashMapE. request_time (uint32) -> jettons_to_unstake (coins)
global int   storage::total_requested_jettons;

global int   storage::is_active;                ;; int1
global int   storage::has_pending_transfer;     ;; int1

global int   storage::unstake_commission;       ;; Uint32. commission rate for instant unstakes
global int   storage::unstake_fee;              ;; Coins. const TON fee
        
global int   storage::min_deposit;
global int   storage::max_deposit;  
global cell  storage::whitelist;"""


def to_camel_case(s: str) -> str:
    res = s[0]
    for j in range(1, len(s)):
        if s[j] == "_":
            continue
        if s[j-1] == "_":
            res = res + s[j].upper()
        else:
            res = res + s[j]
    return res

def to_config(s: str) -> str:
    t = []
    for i in s.split('\n'):
        if not i.strip():
            continue

        type_, var = i.split()[1:3]
        type_ = type_.capitalize().replace("Int", "bigint").replace("Slice", "Address")

        var = to_camel_case(var[len("storage::"):-1])
        t.append(f"{var}: {type_};")

    return "\n".join(t)


def to_cell(s: str) -> str:
    s = s.replace("storage::", "config.").replace("store_slice", "storeAddress")
    return to_camel_case(s)


def get_storage_data_fc(s: str) -> str:
    vars = []
    types = []
    for i in s.split('\n'):
        if not i.strip():
            continue
        type_, var = i.split()[1:3]
        types.append(type_)
        vars.append(var[:-1])
    return f"""({', '.join(types)}) get_storage_data() method_id {'{'}
    return (
        {',\n        '.join(vars)}
    );
{'}'}"""


def get_storage_data_ts(s: str) -> str:
    res = []
    for i in s.split('\n'):
        if not i.strip():
            continue
        type_, var = i.split()[1:3]
        var = to_camel_case(var[len("storage::"):-1])
        type_ = type_.capitalize().replace("Int", "BigNumber").replace("Slice", "Address")
        res.append(f"{var}: stack.read{type_}()")
    return f"""async getStorageData(provider: ContractProvider) {'{'}
        let { '{ stack }' } = await provider.get('get_storage_data', []);

        return {'{'} 
            {',\n            '.join(res)}
        {'}'}
    {'}'}"""


def get_constants(s: str) -> str:
    res = []
    for i in s.split('\n'):
        i = i.strip()
        if not i:
            continue
        if i.startswith(";;"):
            res.append(f"\n    {i}")
            continue
        i = i.split("::")[1] #[:-1]
        tmp = ''
        space = 0
        for j in i:
            if not space and j == ' ':
                j = ":"
                space = 1
            if j == '=':
                j = ' '
            tmp = tmp + j
        tmp = tmp.replace(';;', '//').replace(';', ',')
        res.append(tmp.upper())
    return '\n    '.join(res)
            
# print(to_config(global_variables))
# print(to_cell("""begin_cell()
#                         .store_slice(pool_address)
#                         .store_slice(owner_address)
#                         .store_uint(lock_period, 32)
#                         .store_uint(0, 10)
#                         .store_int(true, 1)
#                     .end_cell()"""))
print(get_constants("""const int gas::min_reserve           = 20000000n;   ;; 0.02  TON
const int gas::deploy_pool           = 120000000n;  ;; 0.12  TON
const int gas::notification          = 10000000n;   ;; 0.01  TON
const int gas::jetton_transfer       = 55000000n;   ;; 0.055 TON
const int gas::burn_jettons          = 50000000n;   ;; 0.05  TON

const int gas::stake_jettons         = 155000000n;  ;; 0.155 TON
const int gas::unstake_jettons       = 155000000n;  ;; 0.155 TON
const int gas::cancel_unstake        = 110000000n;  ;; 0.11  TON
const int gas::send_commissions      = 120000000n;  ;; 0.12  TON
const int gas::simple_update_request = 100000000n;  ;; 0.1   TON
const int gas::add_rewards           = 65000000n;   ;; 0.065 TON
 
const int gas::approve_transfer      = 20000000n;   ;; 0.02  TON
const int gas::save_updated_rewards  = 10000000n;   ;; 0.01  TON
const int gas::min_excess            = 10000000n;   ;; 0.01  TON
const int gas::send_staked_jettons   = 70000000n;   ;; 0.07  TON """))