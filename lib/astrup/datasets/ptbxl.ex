defmodule Astrup.Datasets.PTBXL do
  @moduledoc """
  Convenience module for working with PTB-XL dataset.

  This module provides aliases for commonly used PTB-XL functionality.
  """

  # Aliases for easier access
  alias Astrup.Datasets.PTBXL.Parser
  alias Astrup.Datasets.PTBXL.Selector

  # Re-export main functions for convenience
  defdelegate parse_file(filename), to: Parser
  defdelegate parse_string(content), to: Parser

  defdelegate select_by_diagnosis(records, count), to: Selector
  defdelegate select_by_scp_code(records, count), to: Selector
  defdelegate select_by_diagnostic_class(records, count), to: Selector
  defdelegate select_by_rhythm_code(records, count), to: Selector
  defdelegate select_by_form_code(records, count), to: Selector
  defdelegate get_by_scp_code(records, scp_code, count), to: Selector
  defdelegate get_by_rhythm_code(records, rhythm_code, count), to: Selector
  defdelegate get_by_form_code(records, form_code, count), to: Selector
  defdelegate get_available_diagnoses(records), to: Selector
  defdelegate get_all_scp_codes(records, filter_level \\ :all_records), to: Selector
  defdelegate get_scp_code_details(records, filter_level \\ :all_records), to: Selector
  defdelegate get_selection_summary(selected_ecgs), to: Selector
  defdelegate get_primary_diagnosis(record), to: Selector
end
