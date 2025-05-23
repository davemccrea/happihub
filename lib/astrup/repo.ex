defmodule Astrup.Repo do
  use Ecto.Repo,
    otp_app: :astrup,
    adapter: Ecto.Adapters.Postgres
end
