using System;
using System.Diagnostics;
using System.IO;
using System.Globalization;

internal static class Program
{
    private static int Main(string[] args)
    {
        string root = AppDomain.CurrentDomain.BaseDirectory
            .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

        try
        {
            if (args.Length == 0)
            {
                ValidateProject(root);
                return LaunchAll(root, new string[] { "--all" });
            }

            if (IsOption(args[0], "--help") || IsOption(args[0], "-h"))
            {
                PrintUsage();
                return 0;
            }

            if (IsOption(args[0], "--menu"))
            {
                if (args.Length != 1) throw new ArgumentException("--menu nao aceita argumentos adicionais.");
                return ShowMenu(root);
            }

            ValidateProject(root);
            if (IsOption(args[0], "--check"))
            {
                RunCheck(root);
                Console.WriteLine("SKYNET validado: dashboard, Node, laboratorio A/B/C, WebSocket e simulacao local.");
                return 0;
            }

            if (IsOption(args[0], "--dashboard"))
            {
                if (args.Length != 1) throw new ArgumentException("--dashboard nao aceita argumentos adicionais.");
                return LaunchDashboard(root);
            }

            if (IsOption(args[0], "--cidade"))
            {
                return LaunchCityExecutor(root, args);
            }

            if (IsOption(args[0], "--all"))
            {
                return LaunchAll(root, args);
            }

            throw new ArgumentException("Opcao desconhecida: " + args[0]);
        }
        catch (Exception error)
        {
            Console.Error.WriteLine("Falha ao iniciar o SKYNET: " + error.Message);
            if (args.Length == 0)
            {
                Console.Error.WriteLine("Pressione Enter para fechar.");
                Console.ReadLine();
            }
            return 1;
        }
    }

    private static int ShowMenu(string root)
    {
        ValidateProject(root);
        while (true)
        {
            Console.WriteLine();
            Console.WriteLine("SKYNET V8 LUCIFER - EXECUTOR LOCAL");
            Console.WriteLine("1. Abrir dashboard e servicos Node/Vite");
            Console.WriteLine("2. Executar simulacao local de 289 rodadas");
            Console.WriteLine("3. Mostrar arquivo de integracao Tampermonkey");
            Console.WriteLine("4. Validar arquivos e dependencias");
            Console.WriteLine("0. Sair");
            Console.Write("Escolha: ");
            string choice = Console.ReadLine();

            if (choice == "0") return 0;
            if (choice == "1")
            {
                int result = LaunchDashboard(root);
                if (result != 0) return result;
            }
            else if (choice == "2")
            {
                int result = LaunchCityExecutor(root, new string[] { "--cidade" });
                if (result != 0) return result;
            }
            else if (choice == "3")
            {
                string userscript = Path.Combine(root, "tampermonkey\\SKYNET-PGSOFT-OBSERVER.user.js");
                Console.WriteLine("Userscript: " + userscript);
                Console.WriteLine("Importe esse arquivo pelo painel da extensao Tampermonkey no navegador.");
            }
            else if (choice == "4")
            {
                RunCheck(root);
                Console.WriteLine("Validacao concluida.");
            }
            else
            {
                Console.WriteLine("Opcao invalida.");
            }
        }
    }

    private static int LaunchDashboard(string root)
    {
        string script = Path.Combine(root, "INICIAR-SKYNET-V8.cmd");
        string commandProcessor = Environment.GetEnvironmentVariable("ComSpec");
        if (string.IsNullOrEmpty(commandProcessor))
        {
            commandProcessor = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.System),
                "cmd.exe");
        }

        return RunProcess(commandProcessor, "/d /c \"\"" + script + "\"\"", root);
    }

    private static int LaunchAll(string root, string[] args)
    {
        int dashboardResult = LaunchDashboard(root);
        if (dashboardResult != 0)
        {
            Console.Error.WriteLine("Dashboard nao iniciou corretamente; a simulacao nao foi executada.");
            return dashboardResult;
        }

        string[] cityArgs = new string[args.Length];
        cityArgs[0] = "--cidade";
        for (int index = 1; index < args.Length; index++)
        {
            cityArgs[index] = args[index];
        }

        Console.WriteLine();
        Console.WriteLine("Dashboard iniciado; executando os modulos locais integrados.");
        int simulationResult = LaunchCityExecutor(root, cityArgs);
        if (simulationResult != 0) return simulationResult;

        Console.WriteLine();
        Console.WriteLine("Fluxo completo concluido.");
        Console.WriteLine("Userscript Tampermonkey (instalacao manual na extensao):");
        Console.WriteLine(Path.Combine(root, "tampermonkey\\SKYNET-PGSOFT-OBSERVER.user.js"));
        return 0;
    }

    private static int LaunchCityExecutor(string root, string[] args)
    {
        int rounds = 289;
        long seed = 20261123;
        for (int index = 1; index < args.Length; index++)
        {
            if (IsOption(args[index], "--rounds") && index + 1 < args.Length)
            {
                if (!int.TryParse(args[++index], NumberStyles.None, CultureInfo.InvariantCulture, out rounds)
                    || rounds < 1 || rounds > 10000)
                {
                    throw new ArgumentException("--rounds deve ser um inteiro entre 1 e 10000.");
                }
            }
            else if (IsOption(args[index], "--seed") && index + 1 < args.Length)
            {
                if (!long.TryParse(args[++index], NumberStyles.None, CultureInfo.InvariantCulture, out seed)
                    || seed < 0 || seed > 4294967295L)
                {
                    throw new ArgumentException("--seed deve ser um inteiro entre 0 e 4294967295.");
                }
            }
            else
            {
                throw new ArgumentException("Argumento invalido para --cidade: " + args[index]);
            }
        }

        string script = Path.Combine(root, "EXECUTOR-CIDADE-COMPLETA.ps1");
        string arguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -File \"" + script
            + "\" -Rounds " + rounds.ToString(CultureInfo.InvariantCulture)
            + " -Seed " + seed.ToString(CultureInfo.InvariantCulture);
        return RunProcess("pwsh.exe", arguments, root);
    }

    private static int RunProcess(string executable, string arguments, string root)
    {
        ProcessStartInfo startInfo = new ProcessStartInfo();
        startInfo.FileName = executable;
        startInfo.Arguments = arguments;
        startInfo.WorkingDirectory = root;
        startInfo.UseShellExecute = false;
        startInfo.CreateNoWindow = false;

        using (Process child = Process.Start(startInfo))
        {
            if (child == null)
            {
                throw new InvalidOperationException("Nao foi possivel iniciar " + executable + ".");
            }

            child.WaitForExit();
            return child.ExitCode;
        }
    }

    private static void RunCheck(string root)
    {
        string[] scripts = {
            "server.cjs",
            "CIDADE-COMPLETA-APOSTAS.cjs",
            "start-dev.cjs"
        };
        foreach (string script in scripts)
        {
            int result = RunProcess("node.exe", "--check \"" + Path.Combine(root, script) + "\"", root);
            if (result != 0)
            {
                throw new InvalidOperationException("Verificacao de sintaxe falhou: " + script);
            }
        }
    }

    private static bool IsOption(string value, string option)
    {
        return string.Equals(value, option, StringComparison.OrdinalIgnoreCase);
    }

    private static void PrintUsage()
    {
        Console.WriteLine("SKYNET-INICIAR.exe");
        Console.WriteLine("  Sem argumentos              Inicia dashboard + simulacao local.");
        Console.WriteLine("  --all [--rounds N] [--seed N]  Executa o fluxo completo.");
        Console.WriteLine("  --menu                      Abre o menu de funcionalidades.");
        Console.WriteLine("  --dashboard                 Inicia o dashboard local.");
        Console.WriteLine("  --cidade [--rounds N] [--seed N]  Executa a simulacao local.");
        Console.WriteLine("  --check                     Valida scripts e dependencias.");
    }

    private static void ValidateProject(string root)
    {
        string[] requiredFiles = {
            "INICIAR-SKYNET-V8.cmd",
            "package.json",
            "server.cjs",
            "core\\scenario-lab.cjs",
            "src\\App.jsx",
            "vite.config.js",
            "start-dev.cjs",
            "EXECUTOR-CIDADE-COMPLETA.ps1",
            "CIDADE-COMPLETA-APOSTAS.cjs",
            "tampermonkey\\SKYNET-PGSOFT-OBSERVER.user.js",
            "node_modules\\express\\package.json",
            "node_modules\\ws\\package.json",
            "node_modules\\vite\\bin\\vite.js"
        };

        foreach (string relativePath in requiredFiles)
        {
            string path = Path.Combine(root, relativePath);
            if (!File.Exists(path))
            {
                throw new FileNotFoundException("Arquivo necessario ausente: " + relativePath, path);
            }
        }

        RequireCommand("node.exe");
        RequireCommand("npm.cmd");
        RequireCommand("pwsh.exe");
    }

    private static void RequireCommand(string command)
    {
        ProcessStartInfo startInfo = new ProcessStartInfo();
        startInfo.FileName = "where.exe";
        startInfo.Arguments = command;
        startInfo.UseShellExecute = false;
        startInfo.CreateNoWindow = true;
        startInfo.RedirectStandardOutput = true;
        startInfo.RedirectStandardError = true;

        using (Process process = Process.Start(startInfo))
        {
            if (process == null)
            {
                throw new InvalidOperationException("Nao foi possivel verificar " + command + ".");
            }

            process.WaitForExit();
            if (process.ExitCode != 0)
            {
                throw new FileNotFoundException(command + " nao foi encontrado no PATH.");
            }
        }
    }
}
