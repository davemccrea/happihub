defmodule AstrupWeb.SavedEcgsLive do
  use AstrupWeb, :live_view

  alias Astrup.ECG

  def mount(_params, _session, socket) do
    saved_ecgs = ECG.get_users_saved_ecgs(socket.assigns.current_scope)

    {:ok, socket |> assign(saved_ecgs: saved_ecgs)}
  end

  def handle_event("remove_ecg", %{"id" => id}, socket) do
    id = String.to_integer(id)
    case ECG.delete_saved_ecg(socket.assigns.current_scope, id) do
      {count, _} when count > 0 ->
        saved_ecgs = ECG.get_users_saved_ecgs(socket.assigns.current_scope)
        {:noreply, socket |> assign(saved_ecgs: saved_ecgs) |> put_flash(:info, "ECG removed successfully")}
      _ ->
        {:noreply, socket |> put_flash(:error, "Failed to remove ECG")}
    end
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale} current_scope={@current_scope}>
      <div class="max-w-4xl mx-auto px-4 py-8">
        <h1 class="text-2xl font-bold mb-6">Saved ECGs</h1>
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th></th>
                <th>db_name</th>
                <th>filename</th>
                <th>date added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr :for={ecg <- @saved_ecgs} class="hover:bg-base-200">
                <th>{ecg.id}</th>
                <td>{ecg.db_name}</td>
                <td>{ecg.filename}</td>
                <td>{Calendar.strftime(ecg.inserted_at, "%d.%m.%Y %H:%M")}</td>
                <td>
                  <div class="flex gap-2">
                    <.link
                      navigate={~p"/ecg/viewer?db=#{ecg.db_name}&filename=#{ecg.filename}"}
                      class="btn btn-sm btn-primary"
                      title="View ECG"
                    >
                      <.icon name="hero-eye" class="w-4 h-4" />
                    </.link>
                    <button
                      phx-click="remove_ecg"
                      phx-value-id={ecg.id}
                      class="btn btn-sm btn-error"
                      data-confirm="Are you sure you want to remove this saved ECG?"
                      title="Remove ECG"
                    >
                      <.icon name="hero-trash" class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Layouts.app>
    """
  end
end
