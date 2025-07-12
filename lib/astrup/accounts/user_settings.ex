defmodule Astrup.Accounts.UserSettings do
  use Ecto.Schema
  import Ecto.Changeset

  alias Astrup.Accounts.User

  schema "user_settings" do
    field :display_mode, :string, default: "single"
    field :current_lead, :integer, default: 1
    field :grid_scale, :float, default: 1.0
    field :amplitude_scale, :float, default: 1.0
    field :height_scale, :float, default: 1.2
    field :grid_type, :string, default: "telemetry"
    field :loop_playback, :boolean, default: true
    field :qrs_indicator, :boolean, default: true
    field :show_diagnostics, :boolean, default: false

    belongs_to :user, User

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(user_settings, attrs) do
    user_settings
    |> cast(attrs, [
      :display_mode,
      :current_lead,
      :grid_scale,
      :amplitude_scale,
      :height_scale,
      :grid_type,
      :loop_playback,
      :qrs_indicator,
      :show_diagnostics
    ])
    |> validate_required([])
    |> validate_inclusion(:display_mode, ["single", "multi"])
    |> validate_inclusion(:grid_type, ["telemetry", "graph_paper"])
    |> validate_number(:current_lead, greater_than_or_equal_to: 0)
    |> validate_number(:grid_scale, greater_than: 0.5, less_than: 2.0)
    |> validate_number(:amplitude_scale, greater_than: 0.5, less_than: 2.0)
    |> validate_number(:height_scale, greater_than: 0.5, less_than: 2.0)
  end
end