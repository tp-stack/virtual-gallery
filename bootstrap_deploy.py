#!/usr/bin/env python3
"""
One-command deployment bootstrap for Virtual Gallery Agent Orchestration.
Automates: environment setup, credential configuration, migrations, verification, and launch.
"""

import os
import sys
import json
import subprocess
import asyncio
import webbrowser
from pathlib import Path
from typing import Optional
import platform


class BootstrapDeployment:
    """Automated deployment bootstrap."""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.agents_dir = self.project_root / "agents"
        self.env_file = self.project_root / ".env.local"
        self.os_type = platform.system()
    
    def log(self, message: str, level: str = "info"):
        """Log with formatting."""
        emoji = {
            "error": "❌",
            "warning": "⚠️ ",
            "success": "✅",
            "info": "ℹ️ ",
            "step": "📍",
        }.get(level, "•")
        print(f"{emoji} {message}")
    
    def run_cmd(self, cmd: str, check: bool = True) -> bool:
        """Run shell command."""
        try:
            subprocess.run(cmd, shell=True, check=check, capture_output=False)
            return True
        except subprocess.CalledProcessError:
            return False
    
    def get_input(self, prompt: str, default: str = "") -> str:
        """Get user input with default."""
        if default:
            user_input = input(f"{prompt} [{default}]: ").strip()
            return user_input or default
        return input(f"{prompt}: ").strip()
    
    def open_browser(self, url: str, title: str = ""):
        """Open URL in browser."""
        if title:
            self.log(f"Opening {title}...", "step")
        try:
            webbrowser.open(url)
        except:
            self.log(f"Go to: {url}", "info")
    
    # ====== Bootstrap Steps ======
    
    def step_1_collect_credentials(self):
        """Step 1: Collect Supabase and Claude credentials."""
        self.log("\nStep 1: Configure Credentials", "step")
        print("=" * 60)
        
        print("\nYou need 3 credentials:")
        print("1. SUPABASE_SECRET_KEY (service role)")
        print("2. SUPABASE_SERVICE_KEY (same as above)")
        print("3. CLAUDE_API_KEY\n")
        
        # Try to load existing
        if self.env_file.exists():
            with open(self.env_file) as f:
                existing = f.read()
                if "SUPABASE_SECRET_KEY" in existing and "CLAUDE_API_KEY" in existing:
                    self.log("✓ .env.local already configured", "success")
                    return True
        
        print("Get credentials from:")
        print("  • Supabase: https://app.supabase.com/project/pkxfxuhrbosqloblttnr/settings/api")
        print("  • Claude: https://console.anthropic.com/")
        print()
        
        self.open_browser("https://app.supabase.com/project/pkxfxuhrbosqloblttnr/settings/api", "Supabase")
        self.open_browser("https://console.anthropic.com/", "Claude")
        
        secret_key = self.get_input("SUPABASE_SECRET_KEY")
        if not secret_key:
            self.log("Cannot proceed without credentials", "error")
            return False
        
        claude_key = self.get_input("CLAUDE_API_KEY")
        if not claude_key:
            self.log("Cannot proceed without Claude key", "error")
            return False
        
        # Update .env.local
        env_content = f"""NEXT_PUBLIC_SUPABASE_URL=https://pkxfxuhrbosqloblttnr.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_5Lk92uN1k_bTM7nuUkg6eA_SqVz10ru
SUPABASE_SECRET_KEY={secret_key}
SUPABASE_SERVICE_KEY={secret_key}
CLAUDE_API_KEY={claude_key}
"""
        
        with open(self.env_file, 'w') as f:
            f.write(env_content)
        
        self.log(".env.local configured", "success")
        return True
    
    def step_2_install_dependencies(self):
        """Step 2: Install Python dependencies."""
        self.log("\nStep 2: Install Dependencies", "step")
        print("=" * 60)
        
        packages = [
            "supabase",
            "python-dotenv",
            "pytest",
            "pytest-asyncio",
            "aiohttp",
            "pydantic"
        ]
        
        self.log("Installing Python packages...", "info")
        for pkg in packages:
            self.run_cmd(f"{sys.executable} -m pip install -q {pkg}")
        
        self.log("Dependencies installed", "success")
        return True
    
    def step_3_verify_setup(self):
        """Step 3: Run verification."""
        self.log("\nStep 3: Verify Setup", "step")
        print("=" * 60)
        
        self.log("Running verification checks...", "info")
        result = self.run_cmd(f"{sys.executable} agents/setup_deployment.py")
        
        if result:
            self.log("Setup verified successfully", "success")
            return True
        else:
            self.log("Verification failed - check output above", "warning")
            return False
    
    async def step_4_test_components(self):
        """Step 4: Test core components."""
        self.log("\nStep 4: Test Components", "step")
        print("=" * 60)
        
        try:
            sys.path.insert(0, str(self.agents_dir))
            
            # Test credentials
            from utils.credentials import validate_credentials
            if not validate_credentials():
                self.log("Credentials validation failed", "error")
                return False
            self.log("Credentials OK", "success")
            
            # Test memory
            from utils.hybrid_memory import get_memory_manager
            memory = get_memory_manager()
            await memory.set("bootstrap_test", {"status": "ok"})
            result = await memory.get("bootstrap_test")
            if result != {"status": "ok"}:
                self.log("Memory test failed", "error")
                return False
            self.log("Memory manager OK", "success")
            
            # Test token counter
            from utils.token_counter import get_token_counter
            counter = get_token_counter()
            if counter.can_use_claude(1000):
                self.log("Token counter OK", "success")
            else:
                self.log("Token counter failed", "error")
                return False
            
            return True
        except Exception as e:
            self.log(f"Component test failed: {e}", "error")
            return False
    
    def step_5_deploy_supabase_migration(self):
        """Step 5: Deploy Supabase migration."""
        self.log("\nStep 5: Deploy Supabase Migration", "step")
        print("=" * 60)
        
        print("\nTwo options:")
        print("1. Use Supabase CLI (requires supabase/cli installed)")
        print("2. Manual via SQL Editor\n")
        
        choice = self.get_input("Use CLI? (1/2)", "1")
        
        if choice == "1":
            self.log("Linking Supabase project...", "info")
            self.run_cmd("supabase link --project-ref pkxfxuhrbosqloblttnr", check=False)
            
            self.log("Applying migrations...", "info")
            result = self.run_cmd("supabase migration up", check=False)
            
            if result:
                self.log("Migration applied successfully", "success")
                return True
            else:
                self.log("Migration failed - apply manually via SQL Editor", "warning")
                self.open_browser(
                    "https://app.supabase.com/project/pkxfxuhrbosqloblttnr/sql",
                    "Supabase SQL Editor"
                )
                return False
        else:
            self.log("Manual migration steps:", "info")
            print("\n1. Go to: https://app.supabase.com/project/pkxfxuhrbosqloblttnr/sql")
            print("2. Click 'New Query'")
            print("3. Copy and paste: supabase/migrations/001_create_artworks.sql")
            print("4. Click 'Run'")
            print("5. Repeat steps 2-4 for: supabase/migrations/002_agent_orchestration.sql\n")
            
            self.open_browser(
                "https://app.supabase.com/project/pkxfxuhrbosqloblttnr/sql",
                "Supabase SQL Editor"
            )
            
            input("Press Enter when migrations are applied...")
            return True
    
    def step_6_launch_orchestrator(self):
        """Step 6: Launch CLI orchestrator."""
        self.log("\nStep 6: Launch Orchestrator", "step")
        print("=" * 60)
        
        print("\nReady to launch! CLI orchestrator will show:")
        print("  [1] Gallery Data Pipeline (2-5 min)")
        print("  [2] Deployment & Build (5-10 min)")
        print("  [3] Security & Compliance (1-2 min)")
        print("  [4] Development (1-2 min)")
        print("  [5] Full Lifecycle (10-20 min) ⭐\n")
        
        launch = self.get_input("Launch orchestrator now? (y/n)", "y")
        
        if launch.lower() == "y":
            print()
            os.chdir(self.agents_dir)
            os.system(f"{sys.executable} cli_orchestrator.py")
            return True
        else:
            print("\nTo launch later, run:")
            print(f"  cd {self.agents_dir}")
            print(f"  {sys.executable} cli_orchestrator.py")
            return False
    
    async def run(self):
        """Run complete bootstrap."""
        print("\n" + "=" * 60)
        print("🚀 VIRTUAL GALLERY - AGENT DEPLOYMENT BOOTSTRAP")
        print("=" * 60)
        
        steps = [
            ("Collect Credentials", self.step_1_collect_credentials),
            ("Install Dependencies", self.step_2_install_dependencies),
            ("Verify Setup", self.step_3_verify_setup),
            ("Test Components", self.step_4_test_components),
            ("Deploy Supabase Migration", self.step_5_deploy_supabase_migration),
            ("Launch Orchestrator", self.step_6_launch_orchestrator),
        ]
        
        completed = 0
        for i, (name, step_func) in enumerate(steps, 1):
            try:
                if asyncio.iscoroutinefunction(step_func):
                    result = await step_func()
                else:
                    result = step_func()
                
                if result:
                    completed += 1
                else:
                    self.log(f"Step {i} encountered issues", "warning")
            except Exception as e:
                self.log(f"Step {i} failed: {e}", "error")
        
        print("\n" + "=" * 60)
        print(f"✅ Bootstrap Complete: {completed}/{len(steps)} steps passed")
        print("=" * 60 + "\n")
        
        if completed == len(steps):
            self.log("All set! Agents are deployed and ready.", "success")
        else:
            self.log("Some steps need attention - see above", "warning")


async def main():
    """Main entry point."""
    bootstrap = BootstrapDeployment()
    await bootstrap.run()


if __name__ == "__main__":
    asyncio.run(main())
