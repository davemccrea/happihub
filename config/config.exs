# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :pythonx, :uv_init,
  pyproject_toml: """
  [project]
  name = "project"
  version = "0.0.0"
  requires-python = "==3.13.*"
  dependencies = [
    "wfdb==4.3.0"
  ]
  """

config :astrup, :scopes,
  user: [
    default: true,
    module: Astrup.Accounts.Scope,
    assign_key: :current_scope,
    access_path: [:user, :id],
    schema_key: :user_id,
    schema_type: :id,
    schema_table: :users,
    test_data_fixture: Astrup.AccountsFixtures,
    test_login_helper: :register_and_log_in_user
  ]

config :gettext, :default_locale, "en"

config :backpex, :pubsub_server, Astrup.PubSub

config :elixir, :time_zone_database, Tzdata.TimeZoneDatabase

config :astrup,
  ecto_repos: [Astrup.Repo],
  generators: [timestamp_type: :utc_datetime]

# Configures the endpoint
config :astrup, AstrupWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [html: AstrupWeb.ErrorHTML, json: AstrupWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: Astrup.PubSub,
  live_view: [signing_salt: "qzobQEnA"]

# Configures the mailer
#
# By default it uses the "Local" adapter which stores the emails
# locally. You can see the emails in your browser, at "/dev/mailbox".
#
# For production it's recommended to configure a different adapter
# at the `config/runtime.exs`.
config :astrup, Astrup.Mailer, adapter: Swoosh.Adapters.Local

# Configure esbuild (the version is required)
config :esbuild,
  version: "0.17.11",
  astrup: [
    args:
      ~w(js/app.js --bundle --target=es2022 --outdir=../priv/static/assets/js --external:/fonts/* --external:/images/* --alias:@=.),
    cd: Path.expand("../assets", __DIR__),
    env: %{"NODE_PATH" => [Path.expand("../deps", __DIR__), Mix.Project.build_path()]}
  ]

# Configure tailwind (the version is required)
config :tailwind,
  version: "4.0.9",
  astrup: [
    args: ~w(
      --input=assets/css/app.css
      --output=priv/static/assets/css/app.css
    ),
    cd: Path.expand("..", __DIR__)
  ]

# Configures Elixir's Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
