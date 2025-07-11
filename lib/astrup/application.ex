defmodule Astrup.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      AstrupWeb.Telemetry,
      Astrup.Repo,
      {DNSCluster, query: Application.get_env(:astrup, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Astrup.PubSub},
      # Start PTB-XL data cache
      Astrup.ECG.Datasets.Ptbxl.GenServer,
      # Start a worker by calling: Astrup.Worker.start_link(arg)
      # {Astrup.Worker, arg},
      # Start to serve requests, typically the last entry
      AstrupWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Astrup.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    AstrupWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
