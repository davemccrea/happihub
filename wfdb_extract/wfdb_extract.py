import os
import json
import wfdb
import numpy as np
from datetime import datetime

class NpEncoder(json.JSONEncoder):
    """
    Custom JSON encoder for NumPy data types.
    This class is used to handle the serialization of NumPy arrays and other
    NumPy-specific data types that the default json encoder cannot handle.
    """
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, (datetime, np.datetime64)):
            return obj.isoformat()
        return super(NpEncoder, self).default(obj)

def find_wfdb_records(directory):
    """
    Recursively finds all unique WFDB record files in a directory.
    It looks for files with '.hea' extensions and returns the base record names
    (without the extension) to avoid processing duplicates (e.g., .dat, .hea).

    Args:
        directory (str): The path to the directory to search.

    Returns:
        set: A set of unique record paths (without file extensions).
    """
    record_paths = set()
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.hea'):
                # Get the full path and remove the extension to get the record name
                record_name = os.path.splitext(os.path.join(root, file))[0]
                record_paths.add(record_name)
    return record_paths

def extract_record_to_json(record_path, output_dir):
    """
    Reads a single WFDB record, extracts its data and metadata,
    and saves it to a JSON file in the specified output directory.

    Args:
        record_path (str): The full path to the WFDB record (without extension).
        output_dir (str): The directory where the JSON file will be saved.
    """
    try:
        print(f"Processing record: {record_path}")
        # Use rdrecord to read both the signal data and the header file info
        record = wfdb.rdrecord(record_path)

        # The record name for the output file
        record_basename = os.path.basename(record_path)
        output_filename = os.path.join(output_dir, f"{record_basename}.json")

        # Create a dictionary to hold all the record's information
        # This makes it easy to serialize to JSON
        record_data = {
            'record_name': record.record_name,
            'n_sig': record.n_sig,
            'fs': record.fs,
            'counter_freq': record.counter_freq,
            'base_counter': record.base_counter,
            'sig_len': record.sig_len,
            'base_time': record.base_time.strftime('%H:%M:%S') if record.base_time else None,
            'base_date': record.base_date.strftime('%Y-%m-%d') if record.base_date else None,
            'comments': record.comments,
            'sig_name': record.sig_name,
            'd_signal': record.d_signal,
            'e_d_signal': record.e_d_signal,
            'p_signal': record.p_signal,
            'e_p_signal': record.e_p_signal,
            'units': record.units,
            'init_value': record.init_value,
            'checksum': record.checksum,
            'block_size': record.block_size,
        }
        
        # Ensure the output directory exists
        os.makedirs(output_dir, exist_ok=True)

        # Write the dictionary to a JSON file
        # We use the custom NpEncoder to handle numpy arrays
        with open(output_filename, 'w') as json_file:
            json.dump(record_data, json_file, cls=NpEncoder, indent=4)

        print(f"Successfully saved to {output_filename}")

    except Exception as e:
        print(f"Could not process record {record_path}. Error: {e}")

def main():
    """
    Main function to drive the script.
    """
    # --- Configuration ---
    # IMPORTANT: Change this to the path of your WFDB directory
    input_directory = '/Users/david/wfdb/ptb-xl/records500'

    # IMPORTANT: Change this to where you want to save the JSON files
    output_directory = '/Users/david/code/2_Projects/happihub/priv/static/assets/json/ptb-xl'
    # -------------------

    print("--- WFDB to JSON Extraction Script ---")
    print(f"Input Directory: {input_directory}")
    print(f"Output Directory: {output_directory}\n")

    if not os.path.isdir(input_directory):
        print(f"Error: Input directory '{input_directory}' not found.")
        print("Please create a 'sample-data/wfdb' directory and place WFDB files inside, or change the 'input_directory' variable.")
        # Create a dummy sample directory and file for demonstration
        print("Creating a sample directory and dummy WFDB files for demonstration...")
        dummy_record_path = os.path.join(input_directory, 'a103l')
        os.makedirs(input_directory, exist_ok=True)
        # Create a simple dummy record for testing purposes
        try:
            sig = np.random.randn(1000, 2) * 100
            wfdb.wrsamp('a103l', fs=250, units=['mV', 'mV'], sig_name=['ECG1', 'ECG2'], p_signal=sig, d_signal=sig.astype(int), write_dir=input_directory)
            print(f"Created dummy record: {dummy_record_path}.hea/dat")
        except Exception as e:
            print(f"Could not create dummy WFDB files. Please ensure the 'wfdb' library is correctly installed. Error: {e}")
            return


    # 1. Find all unique WFDB records
    record_paths = find_wfdb_records(input_directory)

    if not record_paths:
        print("No WFDB (.hea) files found in the specified directory.")
        return

    print(f"Found {len(record_paths)} records to process.\n")

    # 2. Process each record
    for record_path in record_paths:
        extract_record_to_json(record_path, output_directory)

    print("\n--- Extraction Complete ---")

if __name__ == '__main__':
    main()
