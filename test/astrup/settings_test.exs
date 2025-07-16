defmodule Astrup.SettingsTest do
  use Astrup.DataCase

  alias Astrup.Settings
  alias Astrup.Accounts.{User, Scope}

  import Astrup.AccountsFixtures

  @valid_attrs %{
    display_mode: "single",
    current_lead: 1,
    grid_scale: 1.0,
    amplitude_scale: 1.0,
    height_scale: 1.2,
    grid_type: "telemetry",
    loop_playback: true,
    qrs_indicator: true
  }

  @invalid_attrs %{
    display_mode: "invalid",
    current_lead: -1,
    grid_scale: 0.1,
    amplitude_scale: 0.1,
    height_scale: 0.1,
    grid_type: "invalid",
    loop_playback: nil,
    qrs_indicator: nil
  }

  describe "changeset/2" do
    test "changeset with valid attributes" do
      changeset = Settings.changeset(%Settings{}, @valid_attrs)
      assert changeset.valid?
    end

    test "changeset with invalid attributes" do
      changeset = Settings.changeset(%Settings{}, @invalid_attrs)
      refute changeset.valid?
    end

    test "changeset validates display_mode inclusion" do
      changeset = Settings.changeset(%Settings{}, %{display_mode: "invalid"})
      assert "is invalid" in errors_on(changeset).display_mode
    end

    test "changeset accepts valid display_mode values" do
      for mode <- ["single", "multi"] do
        changeset = Settings.changeset(%Settings{}, %{display_mode: mode})
        refute changeset.errors[:display_mode]
      end
    end

    test "changeset validates grid_type inclusion" do
      changeset = Settings.changeset(%Settings{}, %{grid_type: "invalid"})
      assert "is invalid" in errors_on(changeset).grid_type
    end

    test "changeset accepts valid grid_type values" do
      for type <- ["telemetry", "graph_paper"] do
        changeset = Settings.changeset(%Settings{}, %{grid_type: type})
        refute changeset.errors[:grid_type]
      end
    end

    test "changeset validates current_lead is non-negative" do
      changeset = Settings.changeset(%Settings{}, %{current_lead: -1})
      assert "must be greater than or equal to 0" in errors_on(changeset).current_lead
    end

    test "changeset validates grid_scale range" do
      changeset = Settings.changeset(%Settings{}, %{grid_scale: 0.4})
      assert "must be greater than 0.5" in errors_on(changeset).grid_scale

      changeset = Settings.changeset(%Settings{}, %{grid_scale: 2.1})
      assert "must be less than 2.0" in errors_on(changeset).grid_scale
    end

    test "changeset validates amplitude_scale range" do
      changeset = Settings.changeset(%Settings{}, %{amplitude_scale: 0.4})
      assert "must be greater than 0.5" in errors_on(changeset).amplitude_scale

      changeset = Settings.changeset(%Settings{}, %{amplitude_scale: 2.1})
      assert "must be less than 2.0" in errors_on(changeset).amplitude_scale
    end

    test "changeset validates height_scale range" do
      changeset = Settings.changeset(%Settings{}, %{height_scale: 0.4})
      assert "must be greater than 0.5" in errors_on(changeset).height_scale

      changeset = Settings.changeset(%Settings{}, %{height_scale: 2.1})
      assert "must be less than 2.0" in errors_on(changeset).height_scale
    end

    test "changeset accepts valid scale values" do
      changeset =
        Settings.changeset(%Settings{}, %{
          grid_scale: 1.0,
          amplitude_scale: 1.5,
          height_scale: 1.8
        })

      assert changeset.valid?
    end
  end

  describe "get_settings/1" do
    test "returns existing settings for user" do
      user = user_fixture()

      # Create settings for user
      settings =
        %Settings{}
        |> Settings.changeset(@valid_attrs)
        |> Ecto.Changeset.put_assoc(:user, user)
        |> Repo.insert!()

      # Reload user with settings
      user = Repo.preload(user, :settings)
      scope = %Scope{user: user}

      result = Settings.get_settings(scope)
      assert result.id == settings.id
      assert result.display_mode == settings.display_mode
    end

    test "creates and returns default settings when user has no settings" do
      user = user_fixture()
      scope = %Scope{user: user}

      result = Settings.get_settings(scope)
      assert %Settings{} = result
      assert result.display_mode == "single"
      assert result.current_lead == 1
      assert result.grid_scale == 1.0
      assert result.amplitude_scale == 1.0
      assert result.height_scale == 1.2
      assert result.grid_type == "telemetry"
      assert result.loop_playback == true
      assert result.qrs_indicator == true
      assert result.user_id == user.id
    end

    test "returns default settings for non-user scope" do
      result = Settings.get_settings(%Scope{})
      assert %Settings{} = result
      assert result.display_mode == "single"
      assert result.current_lead == 1
      assert is_nil(result.user_id)
    end

    test "returns default settings for nil scope" do
      result = Settings.get_settings(nil)
      assert %Settings{} = result
      assert result.display_mode == "single"
      assert is_nil(result.user_id)
    end
  end

  describe "default values" do
    test "new settings struct has correct defaults" do
      settings = %Settings{}
      assert settings.display_mode == "single"
      assert settings.current_lead == 1
      assert settings.grid_scale == 1.0
      assert settings.amplitude_scale == 1.0
      assert settings.height_scale == 1.2
      assert settings.grid_type == "telemetry"
      assert settings.loop_playback == true
      assert settings.qrs_indicator == true
    end
  end
end
