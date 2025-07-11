defmodule Astrup.ECG.DatasetRegistry do
  @moduledoc """
  Registry for ECG dataset adapters.

  This module manages the mapping between dataset names and their corresponding
  adapter modules. It provides a centralized way to access different ECG datasets.
  """

  alias Astrup.ECG.Datasets.Ptbxl

  @datasets %{
    "ptbxl" => Ptbxl
  }

  @spec get_dataset(String.t()) :: module() | nil
  def get_dataset(dataset_name), do: Map.get(@datasets, dataset_name)

  @spec list_datasets() :: [String.t()]
  def list_datasets, do: Map.keys(@datasets)

  @spec dataset_exists?(String.t()) :: boolean()
  def dataset_exists?(dataset_name), do: Map.has_key?(@datasets, dataset_name)
end
