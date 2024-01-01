Yes, in Arch Linux, you can easily find out which files were installed by a package using the `pacman` package manager. After installing a package with `pacman`, you can use the `-Ql` command to list all files that were installed by that package. Here's how you do it:

1. **Install a Package**: First, install a package as you normally would. For example, to install `vim`, you would use:

    ```bash
    sudo pacman -S vim
    ```

2. **List Installed Files**: After the package is installed, you can list all the files it installed on the system with the following command. Replace `vim` with the name of the package you're interested in:

    ```bash
    pacman -Ql vim
    ```

    This command will display a list of all files and directories that were added to your system by the `vim` package.

3. **Output to a File**: If you want to save this list to a file, you can redirect the output to a text file:

    ```bash
    pacman -Ql vim > vim_installed_files.txt
    ```

    This command will create a file named `vim_installed_files.txt` containing the list of files installed by the `vim` package.

Remember to replace `vim` with the actual package name you're interested in. This method works for any package installed through `pacman` in Arch Linux.
