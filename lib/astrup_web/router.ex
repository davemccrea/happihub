defmodule AstrupWeb.Router do
  use AstrupWeb, :router

  import Backpex.Router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {AstrupWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug AstrupWeb.Plugs.LocalePlug
    plug AstrupWeb.Plugs.LabAnalyzerPlug
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/admin", AstrupWeb do
    pipe_through :browser

    backpex_routes()

    get "/", RedirectController, :redirect_to_printouts

    live_session :admin_session, on_mount: Backpex.InitAssigns do
      live_resources "/printouts", PrintoutsLive
    end
  end

  scope "/", AstrupWeb do
    pipe_through :browser

    live_session :regular_session, on_mount: AstrupWeb.Hooks.LocaleHook do
      live "/", HomeLive

      live "/reference-values/learn", ReferenceValues.LearnLive
      live "/reference-values/quiz", ReferenceValues.QuizLive

      live "/interpretation/learn", Interpretation.LearnLive
      live "/interpretation/quiz", Interpretation.QuizLive
      live "/interpretation/interpreter", Interpretation.InterpreterLive

      live "/submit", SubmitLive
      live "/settings", SettingsLive
    end

    get "/update_settings", SettingsController, :update

    get "/locale/:locale", ChangeLocale, :index
  end

  # Other scopes may use custom stacks.
  # scope "/api", AstrupWeb do
  #   pipe_through :api
  # end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:astrup, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: AstrupWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end
end
