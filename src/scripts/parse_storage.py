import os

files_to_exclude = ["stdlib.fc"]
dirs_to_exclude = ["jetton"]

def count_nonempty_lines(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        # Count lines that contain non-whitespace characters
        return sum(1 for line in file if line.strip())

def find_fc_files(directory='/Users/arkadiystena/JVault/staking-v2/src/contracts'):
    total_lines = 0
    fc_files = []
    
    # Walk through all directories
    for root, _, files in os.walk(directory):
        for file in files:
            # print(file)
            if file.endswith('.fc') and file not in files_to_exclude:
                file_path = os.path.join(root, file)
                tmp = 0
                for d in dirs_to_exclude:
                    if f"/{d}/" in file_path:
                        tmp = 1
                        break
                if tmp == 1:
                    continue

                fc_files.append(file_path)
                lines = count_nonempty_lines(file_path)
                total_lines += lines
                print(f"{file_path}: {lines} lines")
    
    print(f"\nTotal number of non-empty lines in {len(fc_files)} .fc files: {total_lines}")

if __name__ == '__main__':
    find_fc_files()