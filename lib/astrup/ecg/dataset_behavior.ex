defmodule Astrup.ECG.DatasetBehavior do
  @moduledoc """
  Behavior for ECG dataset adapters.

  This behavior defines a common interface that all ECG dataset modules must implement
  to work with the ECGViewerLive component.
  """

  @type record :: map()
  @type filename :: String.t()

  @type scp_code :: %{
          code: String.t(),
          confidence: float(),
          kind: :diagnostic | :form | :rhythm | :unknown,
          description: String.t(),
          diagnostic_class: String.t() | nil
        }

  @type metadata :: %{
          type: atom(),
          scp_codes: [scp_code()],
          report: String.t() | nil,
          raw_record: record()
        }

  @callback get_by_filename(filename) :: record | nil
  @callback get_all_records() :: [record]
  @callback get_random_record() :: record | nil
  @callback get_metadata(record) :: metadata
end
