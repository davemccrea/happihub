defmodule Astrup.ECGTest do
  use Astrup.DataCase
  alias Astrup.ECG
  alias Astrup.ECG.SavedEcgs
  alias Astrup.Accounts.{User, Scope}

  import Astrup.AccountsFixtures

  describe "save_ecg/2" do
    test "saves ecg with valid attrs" do
      user = user_fixture()
      scope = %Scope{user: user}

      attrs = %{
        db_name: "ptbxl",
        filename: "test_ecg.csv"
      }

      assert {:ok, %SavedEcgs{} = saved_ecg} = ECG.save_ecg(scope, attrs)
      assert saved_ecg.user_id == user.id
      assert saved_ecg.db_name == "ptbxl"
      assert saved_ecg.filename == "test_ecg.csv"
    end

    test "returns error with invalid attrs" do
      user = user_fixture()
      scope = %Scope{user: user}

      attrs = %{}

      assert {:error, %Ecto.Changeset{}} = ECG.save_ecg(scope, attrs)
    end
  end

  describe "get_users_saved_ecgs/1" do
    test "returns all saved ecgs for user" do
      user = user_fixture()
      scope = %Scope{user: user}

      attrs1 = %{
        db_name: "ptbxl",
        filename: "test_ecg1.csv"
      }

      attrs2 = %{
        db_name: "ptbxl",
        filename: "test_ecg2.csv"
      }

      {:ok, saved_ecg1} = ECG.save_ecg(scope, attrs1)
      {:ok, saved_ecg2} = ECG.save_ecg(scope, attrs2)

      saved_ecgs = ECG.get_users_saved_ecgs(scope)

      assert length(saved_ecgs) == 2
      assert Enum.any?(saved_ecgs, fn ecg -> ecg.id == saved_ecg1.id end)
      assert Enum.any?(saved_ecgs, fn ecg -> ecg.id == saved_ecg2.id end)
    end

    test "returns empty list when user has no saved ecgs" do
      user = user_fixture()
      scope = %Scope{user: user}

      saved_ecgs = ECG.get_users_saved_ecgs(scope)

      assert saved_ecgs == []
    end

    test "does not return other users' saved ecgs" do
      user1 = user_fixture()
      user2 = user_fixture()
      scope1 = %Scope{user: user1}
      scope2 = %Scope{user: user2}

      attrs = %{
        db_name: "ptbxl",
        filename: "test_ecg.csv"
      }

      {:ok, _saved_ecg} = ECG.save_ecg(scope1, attrs)

      saved_ecgs = ECG.get_users_saved_ecgs(scope2)

      assert saved_ecgs == []
    end
  end

  describe "is_ecg_saved?/3" do
    test "returns true when ecg is saved" do
      user = user_fixture()
      scope = %Scope{user: user}

      attrs = %{
        db_name: "ptbxl",
        filename: "test_ecg.csv"
      }

      {:ok, _saved_ecg} = ECG.save_ecg(scope, attrs)

      assert ECG.is_ecg_saved?(scope, "ptbxl", "test_ecg.csv")
    end

    test "returns false when ecg is not saved" do
      user = user_fixture()
      scope = %Scope{user: user}

      refute ECG.is_ecg_saved?(scope, "ptbxl", "test_ecg.csv")
    end

    test "returns false when ecg is saved by different user" do
      user1 = user_fixture()
      user2 = user_fixture()
      scope1 = %Scope{user: user1}
      scope2 = %Scope{user: user2}

      attrs = %{
        db_name: "ptbxl",
        filename: "test_ecg.csv"
      }

      {:ok, _saved_ecg} = ECG.save_ecg(scope1, attrs)

      refute ECG.is_ecg_saved?(scope2, "ptbxl", "test_ecg.csv")
    end
  end

  describe "unsave_ecg/3" do
    test "removes saved ecg" do
      user = user_fixture()
      scope = %Scope{user: user}

      attrs = %{
        db_name: "ptbxl",
        filename: "test_ecg.csv"
      }

      {:ok, _saved_ecg} = ECG.save_ecg(scope, attrs)

      assert ECG.is_ecg_saved?(scope, "ptbxl", "test_ecg.csv")

      {count, nil} = ECG.unsave_ecg(scope, "ptbxl", "test_ecg.csv")
      assert count == 1

      refute ECG.is_ecg_saved?(scope, "ptbxl", "test_ecg.csv")
    end

    test "returns 0 when ecg is not saved" do
      user = user_fixture()
      scope = %Scope{user: user}

      {count, nil} = ECG.unsave_ecg(scope, "ptbxl", "test_ecg.csv")
      assert count == 0
    end

    test "does not remove other users' saved ecgs" do
      user1 = user_fixture()
      user2 = user_fixture()
      scope1 = %Scope{user: user1}
      scope2 = %Scope{user: user2}

      attrs = %{
        db_name: "ptbxl",
        filename: "test_ecg.csv"
      }

      {:ok, _saved_ecg} = ECG.save_ecg(scope1, attrs)

      {count, nil} = ECG.unsave_ecg(scope2, "ptbxl", "test_ecg.csv")
      assert count == 0

      assert ECG.is_ecg_saved?(scope1, "ptbxl", "test_ecg.csv")
    end
  end

  describe "delete_saved_ecg/2" do
    test "deletes saved ecg by id" do
      user = user_fixture()
      scope = %Scope{user: user}

      attrs = %{
        db_name: "ptbxl",
        filename: "test_ecg.csv"
      }

      {:ok, saved_ecg} = ECG.save_ecg(scope, attrs)

      {count, nil} = ECG.delete_saved_ecg(scope, saved_ecg.id)
      assert count == 1

      refute ECG.is_ecg_saved?(scope, "ptbxl", "test_ecg.csv")
    end

    test "returns 0 when ecg id does not exist" do
      user = user_fixture()
      scope = %Scope{user: user}

      {count, nil} = ECG.delete_saved_ecg(scope, 999)
      assert count == 0
    end

    test "does not delete other users' saved ecgs" do
      user1 = user_fixture()
      user2 = user_fixture()
      scope1 = %Scope{user: user1}
      scope2 = %Scope{user: user2}

      attrs = %{
        db_name: "ptbxl",
        filename: "test_ecg.csv"
      }

      {:ok, saved_ecg} = ECG.save_ecg(scope1, attrs)

      {count, nil} = ECG.delete_saved_ecg(scope2, saved_ecg.id)
      assert count == 0

      assert ECG.is_ecg_saved?(scope1, "ptbxl", "test_ecg.csv")
    end
  end
end
