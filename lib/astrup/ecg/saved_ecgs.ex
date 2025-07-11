defmodule Astrup.ECG.SavedEcgs do
  use Ecto.Schema
  import Ecto.Changeset

  schema "saved_ecgs" do
    field :db_name, :string
    field :filename, :string
    belongs_to :user, Astrup.Accounts.User

    timestamps()
  end

  @required_attrs [:db_name, :filename, :user_id]

  def changeset(saved_ecg, attrs) do
    saved_ecg
    |> cast(attrs, @required_attrs)
    |> validate_required(@required_attrs)
    |> unique_constraint(@required_attrs)
  end
end
