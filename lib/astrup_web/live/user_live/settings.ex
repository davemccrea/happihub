defmodule AstrupWeb.UserLive.Settings do
  use AstrupWeb, :live_view

  on_mount {AstrupWeb.UserAuth, :require_sudo_mode}

  alias Astrup.Accounts

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} current_scope={@current_scope} locale={@locale}>
      <div class="min-h-screen flex items-center justify-center px-4 py-10">
        <div class="w-full max-w-2xl">
          <.header class="text-center mb-10">
            Account Settings
            <:subtitle>Manage your account email address, password, and application settings</:subtitle>
          </.header>

          <div class="space-y-8">
            <!-- Email Settings -->
            <div class="card bg-base-200 shadow-sm">
              <div class="card-body">
                <h3 class="card-title text-lg mb-4">Email Address</h3>
                <.form for={@email_form} id="email_form" phx-submit="update_email" phx-change="validate_email">
                  <.input
                    field={@email_form[:email]}
                    type="email"
                    label="Email"
                    autocomplete="username"
                    required
                  />
                  <div class="card-actions justify-end mt-6">
                    <.button variant="primary" phx-disable-with="Changing...">Change Email</.button>
                  </div>
                </.form>
              </div>
            </div>

            <!-- Password Settings -->
            <div class="card bg-base-200 shadow-sm">
              <div class="card-body">
                <h3 class="card-title text-lg mb-4">Password</h3>
                <.form
                  for={@password_form}
                  id="password_form"
                  action={~p"/users/update-password"}
                  method="post"
                  phx-change="validate_password"
                  phx-submit="update_password"
                  phx-trigger-action={@trigger_submit}
                >
                  <input
                    name={@password_form[:email].name}
                    type="hidden"
                    id="hidden_user_email"
                    autocomplete="username"
                    value={@current_email}
                  />
                  <.input
                    field={@password_form[:password]}
                    type="password"
                    label="New password"
                    autocomplete="new-password"
                    required
                  />
                  <.input
                    field={@password_form[:password_confirmation]}
                    type="password"
                    label="Confirm new password"
                    autocomplete="new-password"
                  />
                  <div class="card-actions justify-end mt-6">
                    <.button variant="primary" phx-disable-with="Saving...">
                      Save Password
                    </.button>
                  </div>
                </.form>
              </div>
            </div>

            <!-- Application Settings -->
            <div class="card bg-base-200 shadow-sm">
              <div class="card-body">
                <h3 class="card-title text-lg mb-4">Application Settings</h3>
                <.form for={@settings_form} id="settings_form" phx-submit="update_settings" phx-change="validate_settings">
                  <.input
                    field={@settings_form[:laboratory]}
                    type="select"
                    label="Laboratory"
                    options={[{"Fimlab", "Astrup.Lab.Fimlab"}]}
                    required
                  />
                  <.input
                    field={@settings_form[:analyzer]}
                    type="select"
                    label="Analyzer"
                    options={[{"Radiometer ABL90 FLEX PLUS", "Astrup.Analyzer.RadiometerAbl90FlexPlus"}]}
                    required
                  />
                  <div class="card-actions justify-end mt-6">
                    <.button variant="primary" phx-disable-with="Saving...">
                      Save Settings
                    </.button>
                  </div>
                </.form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layouts.app>
    """
  end

  def mount(%{"token" => token}, session, socket) do
    socket =
      case Accounts.update_user_email(socket.assigns.current_scope.user, token) do
        :ok ->
          put_flash(socket, :info, "Email changed successfully.")

        :error ->
          put_flash(socket, :error, "Email change link is invalid or it has expired.")
      end

    {:ok,
     socket
     |> assign(:locale, session["locale"] || "en")
     |> push_navigate(to: ~p"/users/settings")}
  end

  def mount(_params, session, socket) do
    user = socket.assigns.current_scope.user
    email_changeset = Accounts.change_user_email(user, %{}, validate_email: false)
    password_changeset = Accounts.change_user_password(user, %{}, hash_password: false)
    settings_changeset = Accounts.change_user_settings(user, %{})

    socket =
      socket
      |> assign(:current_email, user.email)
      |> assign(:email_form, to_form(email_changeset))
      |> assign(:password_form, to_form(password_changeset))
      |> assign(:settings_form, to_form(settings_changeset))
      |> assign(:trigger_submit, false)
      |> assign(:locale, session["locale"] || "en")

    {:ok, socket}
  end

  def handle_event("validate_email", params, socket) do
    %{"user" => user_params} = params

    email_form =
      socket.assigns.current_scope.user
      |> Accounts.change_user_email(user_params, validate_email: false)
      |> Map.put(:action, :validate)
      |> to_form()

    {:noreply, assign(socket, email_form: email_form)}
  end

  def handle_event("update_email", params, socket) do
    %{"user" => user_params} = params
    user = socket.assigns.current_scope.user
    true = Accounts.sudo_mode?(user)

    case Accounts.change_user_email(user, user_params) do
      %{valid?: true} = changeset ->
        Accounts.deliver_user_update_email_instructions(
          Ecto.Changeset.apply_action!(changeset, :insert),
          user.email,
          &url(~p"/users/settings/confirm-email/#{&1}")
        )

        info = "A link to confirm your email change has been sent to the new address."
        {:noreply, socket |> put_flash(:info, info)}

      changeset ->
        {:noreply, assign(socket, :email_form, to_form(changeset, action: :insert))}
    end
  end

  def handle_event("validate_password", params, socket) do
    %{"user" => user_params} = params

    password_form =
      socket.assigns.current_scope.user
      |> Accounts.change_user_password(user_params, hash_password: false)
      |> Map.put(:action, :validate)
      |> to_form()

    {:noreply, assign(socket, password_form: password_form)}
  end

  def handle_event("update_password", params, socket) do
    %{"user" => user_params} = params
    user = socket.assigns.current_scope.user
    true = Accounts.sudo_mode?(user)

    case Accounts.change_user_password(user, user_params) do
      %{valid?: true} = changeset ->
        {:noreply, assign(socket, trigger_submit: true, password_form: to_form(changeset))}

      changeset ->
        {:noreply, assign(socket, password_form: to_form(changeset, action: :insert))}
    end
  end

  def handle_event("validate_settings", params, socket) do
    %{"user" => user_params} = params

    settings_form =
      socket.assigns.current_scope.user
      |> Accounts.change_user_settings(user_params)
      |> Map.put(:action, :validate)
      |> to_form()

    {:noreply, assign(socket, settings_form: settings_form)}
  end

  def handle_event("update_settings", params, socket) do
    %{"user" => user_params} = params
    user = socket.assigns.current_scope.user

    case Accounts.update_user_settings(user, user_params) do
      {:ok, _user} ->
        {:noreply, socket |> put_flash(:info, "Settings updated successfully.")}

      {:error, changeset} ->
        {:noreply, assign(socket, settings_form: to_form(changeset, action: :insert))}
    end
  end
end
