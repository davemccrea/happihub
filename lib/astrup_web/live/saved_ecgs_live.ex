defmodule AstrupWeb.SavedEcgsLive do
  use AstrupWeb, :live_view

  alias Astrup.Ecgs

  def mount(_params, _session, socket) do
    saved_ecgs = Ecgs.get_users_saved_ecgs(socket.assigns.current_scope)

    {:ok, socket |> assign(saved_ecgs: saved_ecgs)}
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
                <.link navigate={~p"/ecg/viewer?db=#{ecg.db_name}&filename=#{ecg.filename}"} class="btn btn-sm btn-primary">
                  View
                </.link>
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
