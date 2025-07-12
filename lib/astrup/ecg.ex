defmodule Astrup.ECG do
  alias Astrup.Repo
  alias Astrup.Accounts.User
  alias Astrup.Accounts.Scope
  alias Astrup.ECG.SavedEcgs

  import Ecto.Query

  def save_ecg(%Scope{user: %User{id: user_id}}, attrs) do
    %SavedEcgs{}
    |> SavedEcgs.changeset(Map.put(attrs, :user_id, user_id))
    |> Repo.insert()
  end

  def get_users_saved_ecgs(%Scope{user: %User{id: user_id}}) do
    Repo.all(from(s in SavedEcgs, where: s.user_id == ^user_id))
  end

  def is_ecg_saved?(%Scope{user: %User{id: user_id}}, dataset_name, filename) do
    query =
      from(s in SavedEcgs,
        where: s.user_id == ^user_id and s.db_name == ^dataset_name and s.filename == ^filename
      )

    Repo.exists?(query)
  end

  def unsave_ecg(%Scope{user: %User{id: user_id}}, dataset_name, filename) do
    query =
      from(s in SavedEcgs,
        where: s.user_id == ^user_id and s.db_name == ^dataset_name and s.filename == ^filename
      )

    Repo.delete_all(query)
  end

  def delete_saved_ecg(%Scope{user: %User{id: user_id}}, ecg_id) do
    query =
      from(s in SavedEcgs,
        where: s.user_id == ^user_id and s.id == ^ecg_id
      )

    Repo.delete_all(query)
  end
end
