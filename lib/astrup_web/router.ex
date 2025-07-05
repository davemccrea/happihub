defmodule AstrupWeb.Router do
  use AstrupWeb, :router

  import AstrupWeb.UserAuth

  import Backpex.Router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {AstrupWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug :fetch_current_scope_for_user
    plug AstrupWeb.Plugs.LocalePlug
    plug AstrupWeb.Plugs.LabAnalyzerPlug
  end

  pipeline :api do
    plug :accepts, ["json"]
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

  ## Authentication routes

  scope "/", AstrupWeb do
    pipe_through [:browser, :require_authenticated_user]

    live_session :require_authenticated_user,
      on_mount: [AstrupWeb.Hooks.LocaleHook, {AstrupWeb.UserAuth, :require_authenticated}] do
      live "/", HomeLive
      live "/reference-values/learn", ReferenceValues.LearnLive
      live "/reference-values/quiz", ReferenceValues.QuizLive
      live "/interpretation/learn", Interpretation.LearnLive
      live "/interpretation/quiz", Interpretation.QuizLive
      live "/interpretation/interpreter", Interpretation.InterpreterLive
      live "/submit", SubmitLive
      live "/ecg", ECGLive
      live "/users/settings", UserLive.Settings, :edit
      live "/users/settings/confirm-email/:token", UserLive.Settings, :confirm_email
    end

    post "/users/update-password", UserSessionController, :update_password
  end

  scope "/admin", AstrupWeb do
    pipe_through :browser

    backpex_routes()

    get "/", RedirectController, :redirect_to_patient_cases

    live_session :admin_session, on_mount: Backpex.InitAssigns do
      live_resources "/patient-cases", Admin.PatientCasesLive
    end
  end

  scope "/", AstrupWeb do
    pipe_through [:browser]

    live_session :current_user,
      on_mount: [{AstrupWeb.UserAuth, :mount_current_scope}] do
      live "/users/register", UserLive.Registration, :new
      live "/users/log-in", UserLive.Login, :new
      live "/users/log-in/:token", UserLive.Confirmation, :new
    end

    get "/locale/:locale", ChangeLocale, :index
    post "/users/log-in", UserSessionController, :create
    delete "/users/log-out", UserSessionController, :delete
  end
end
