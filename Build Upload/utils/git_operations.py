# File: utils/git_operations.py (FINAL, ROBUST HISTORY RESET)

import os
import requests
import shutil
import sys
import subprocess
from git import Repo, GitCommandError, PushInfo

def _format_commit_date(dt):
    """Formats a datetime object into 'Month Day-suffix, Year "",_format_commit_date(dt):"""
    """Formats a datetime object into 'Month Day-suffix, Year \u2022 H:MM AM/PM'."""
    day = dt.day
    if 4 <= day <= 20 or 24 <= day <= 30:
        suffix = "th"
    else:
        suffix = ["st", "nd", "rd"][day % 10 - 1]

    hour_12 = dt.strftime('%I')
    if hour_12.startswith('0'):
        hour_12 = hour_12[1:]
    time_str = f"{hour_12}:{dt.strftime('%M%p')}"

    return dt.strftime(f'%B {day}{suffix}, %Y \u2022 {time_str}')

class GitOperations:
    def __init__(self, root_path):
        self.root_path = root_path
        self.repo = self._get_repo()

    def _get_repo(self):
        try:
            return Repo(self.root_path)
        except Exception:
            return None

    def is_repo(self):
        return self.repo is not None

    def get_all_ignored_paths(self):
        """Gets a set of all git-ignored relative paths using ls-files, which is much faster."""
        if not self.is_repo():
            return set()
        try:
            startupinfo = None
            if sys.platform == 'win32':
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = subprocess.SW_HIDE
            
            # --directory option is key: it treats ignored directories as a single item
            # instead of listing every file within them. This is a huge performance gain.
            proc = subprocess.Popen(
                ['git', 'ls-files', '--others', '--ignored', '--exclude-standard', '--directory', '-z'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=self.root_path,
                startupinfo=startupinfo
            )
            stdout, stderr = proc.communicate()

            if proc.returncode != 0:
                error_message = stderr.decode('utf-8', errors='ignore').strip()
                if error_message:
                    print(f"git ls-files error: {error_message}")
                return set()
            
            output_str = stdout.decode('utf-8', errors='ignore')
            # git ls-files returns paths with forward slashes. Directories will end with a '/'.
            # We normalize to the OS-specific separator and remove trailing slashes for consistency.
            ignored_paths = {os.path.normpath(p.rstrip('/')) for p in output_str.split('\0') if p}
            return ignored_paths
        except FileNotFoundError:
            print("WARNING: Git executable not found. Git-ignore status will not be available.")
            return set()
        except Exception as e:
            print(f"Error getting git ignored files: {e}")
            return set()

    def add_to_gitignore(self, relative_paths):
        """Adds a list of relative paths to the .gitignore file."""
        if not self.is_repo():
            return False, "Not a Git repository."
        
        gitignore_path = os.path.join(self.root_path, '.gitignore')
        
        formatted_paths = []
        for p in relative_paths:
            full_path = os.path.join(self.root_path, p)
            path_str = p.replace(os.sep, '/') + ('/' if os.path.isdir(full_path) else '')
            formatted_paths.append(path_str)

        try:
            existing_patterns = set()
            ends_with_newline = True
            if os.path.exists(gitignore_path):
                with open(gitignore_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    existing_patterns = {line.strip() for line in content.splitlines() if line.strip()}
                    if content and not content.endswith(('\n', '\r\n')):
                        ends_with_newline = False

            new_patterns = sorted([p for p in formatted_paths if p not in existing_patterns])

            if new_patterns:
                with open(gitignore_path, 'a', encoding='utf-8') as f:
                    prefix = ''
                    # If the file exists but doesn't end with a newline, add one.
                    if not ends_with_newline:
                        prefix = '\n'
                    
                    f.write(prefix + '\n'.join(new_patterns) + '\n')
            
            # Stage the .gitignore file to force Git to update its cache.
            self.repo.index.add([gitignore_path])

            # Untrack any files that were previously tracked (git rm --cached).
            files_to_untrack = []
            for p in relative_paths:
                try:
                    # self.repo.git.ls_files(p) finds all tracked files under path p.
                    tracked_files_under_p = self.repo.git.ls_files(p)
                    if tracked_files_under_p:
                        files_to_untrack.extend(tracked_files_under_p.splitlines())
                except GitCommandError:
                    # This can happen if a path doesn't exist. It's safe to ignore,
                    # as it means there's nothing to untrack for this path.
                    pass
            
            if files_to_untrack:
                # Remove duplicates and untrack the files from the index.
                self.repo.index.remove(list(set(files_to_untrack)), working_tree=False)

            return True, None
        except Exception as e:
            return False, str(e)

    def remove_from_gitignore(self, relative_paths):
        """Removes patterns matching the relative paths from .gitignore."""
        gitignore_path = os.path.join(self.root_path, '.gitignore')
        if not os.path.exists(gitignore_path):
            return True, "No .gitignore file to modify."

        patterns_to_remove = set()
        for p in relative_paths:
            p_norm = p.replace(os.sep, '/')
            patterns_to_remove.add(p_norm)
            patterns_to_remove.add(p_norm + '/')

        try:
            with open(gitignore_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            with open(gitignore_path, 'w', encoding='utf-8') as f:
                for line in lines:
                    if line.strip() not in patterns_to_remove:
                        f.write(line)

            # THE FIX: Stage the .gitignore file to force Git to update its cache.
            self.repo.index.add([gitignore_path])

            return True, None
        except Exception as e:
            return False, str(e)

    def create_github_repo(self, repo_name, token, username):
        """Creates a new private repository on GitHub."""
        url = "https://api.github.com/user/repos"
        headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json"
        }
        data = {
            "name": repo_name,
            "private": True,
            "description": "Repository created by Coding Assistant"
        }
        try:
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            repo_data = response.json()
            return repo_data.get('clone_url'), None
        except requests.exceptions.HTTPError as e:
            error_details = e.response.json()
            message = error_details.get('message', 'Unknown error')
            if 'errors' in error_details and error_details['errors']:
                message = error_details['errors'][0].get('message', message)
            return None, f"GitHub API Error: {message}"
        except Exception as e:
            return None, f"An unexpected error occurred: {e}"

    def initialize_repo(self, repo_url, app_settings):
        """Initializes a local repository, commits, and pushes to the remote URL."""
        try:
            large_file_settings = app_settings.get_large_file_settings()
            files_ignored_count = 0
            if large_file_settings.get('enabled', False):
                threshold_bytes = large_file_settings.get('threshold_mb', 50) * 1024 * 1024
                large_files = []
                for dirpath, _, filenames in os.walk(self.root_path):
                    if '.git' in dirpath.split(os.sep):
                        continue
                    for f in filenames:
                        full_path = os.path.join(dirpath, f)
                        try:
                            if os.path.getsize(full_path) > threshold_bytes:
                                relative_path = os.path.relpath(full_path, self.root_path)
                                large_files.append(relative_path.replace(os.sep, '/'))
                        except OSError:
                            continue
                
                if large_files:
                    gitignore_path = os.path.join(self.root_path, '.gitignore')
                    with open(gitignore_path, 'a', encoding='utf-8') as f:
                        f.write('\n# Automatically ignored large files (>= {}MB)\n'.format(large_file_settings.get('threshold_mb', 50)))
                        f.write('\n'.join(large_files) + '\n')
                    files_ignored_count = len(large_files)

            gitignore_path = os.path.join(self.root_path, '.gitignore')
            if not os.path.exists(gitignore_path):
                with open(gitignore_path, 'w', encoding='utf-8') as f:
                    f.write("# Build artifacts and dependencies\n")
                    f.write("build/\n")
                    f.write("vendor/\n\n")
                    f.write("# Python specific\n")
                    f.write("__pycache__/\n")
                    f.write("*.pyc\n\n")
                    f.write("# Environment variables\n")
                    f.write(".env\n")
                    f.write(".venv/\n")
                    f.write("venv/\n")
                    f.write("env/\n")

            self.repo = Repo.init(self.root_path)
            self.repo.git.add(A=True)
            self.repo.index.commit("Project Initialization")
            origin = self.repo.create_remote('origin', repo_url)
            self.repo.git.branch('-M', 'main')
            origin.push(refspec='main:main', force=True)
            self.repo.git.branch('--set-upstream-to=origin/main', 'main')
            
            success_message = f"Successfully initialized and pushed to new repository."
            if files_ignored_count > 0:
                plural = 's' if files_ignored_count > 1 else ''
                success_message += f" Automatically ignored {files_ignored_count} large file{plural}."

            return True, success_message
        except GitCommandError as e:
            return False, f"Git command failed: {e.stderr}"
        except Exception as e:
            return False, f"An error occurred during initialization: {e}"

    def get_status(self):
        """Gets the status of the repository, including pending changes and commit log."""
        if not self.is_repo():
            return {'is_repo': False}
        
        # Check if HEAD is valid (i.e., if any commits exist)
        has_head_commit = True
        try:
            self.repo.head.commit
        except ValueError:
            # This happens in a freshly initialized repo with no commits
            has_head_commit = False
            
        # Correctly get all types of changes: staged, unstaged, and untracked.
        # Only check staged files against HEAD if a commit exists
        if has_head_commit:
            staged_files = [item.a_path for item in self.repo.index.diff('HEAD')]
        else:
            staged_files = []
            
        unstaged_files = [item.a_path for item in self.repo.index.diff(None)]
        changed_files = list(set(staged_files + unstaged_files))
        untracked_files = self.repo.untracked_files
        
        pending_files = changed_files + untracked_files
        has_pending_changes = bool(pending_files)

        commits = []
        try:
            for commit in self.repo.iter_commits('--all', max_count=100):
                commits.append({
                    'hash': commit.hexsha,
                    'message': commit.message.strip(),
                    'author': commit.author.name,
                    'date': _format_commit_date(commit.committed_datetime),
                    'parent_hashes': [p.hexsha for p in commit.parents]
                })
        except GitCommandError:
            pass

        is_repo_for_ui = True
        try:
            self.repo.remote(name='origin')
        except ValueError:
            is_repo_for_ui = False

        current_head_hash = ''
        try:
            if self.repo.head.is_detached:
                current_head_hash = self.repo.head.object.hexsha
            else:
                current_head_hash = self.repo.head.commit.hexsha
        except Exception:
            pass

        remote_url = ''
        try:
            if self.repo.remotes:
                remote_url = self.repo.remote(name='origin').url
        except (ValueError, GitCommandError):
            # No remote named 'origin' or other git error
            pass

        return {
            'is_repo': is_repo_for_ui,
            'has_pending_changes': has_pending_changes,
            'pending_files': pending_files,
            'log': commits,
            'current_head_hash': current_head_hash,
            'remote_url': remote_url
        }

    def commit(self, message):
        """Commits all current changes, handling detached HEAD state by creating a new branch."""
        if not self.is_repo():
            return False, "Not a Git repository."
        try:
            is_detached = self.repo.head.is_detached
            
            self.repo.git.add(A=True)
            if not self.repo.is_dirty(untracked_files=True):
                return False, "No changes to commit."
            
            self.repo.index.commit(message)

            if is_detached:
                # The new commit was made from a detached HEAD.
                # Create a new branch from this commit instead of overwriting history.
                new_commit = self.repo.head.commit
                branch_name = f"backup/{new_commit.hexsha[:7]}"
                new_branch = self.repo.create_head(branch_name, new_commit)
                new_branch.checkout()
            
            return True, None
        except Exception as e:
            return False, f"Failed to commit: {e}"

    def push(self):
        """Pushes current branch and ALSO forces update to main branch on origin."""
        if not self.is_repo():
            return False, "Not a Git repository."
        try:
            origin = self.repo.remote(name='origin')
            current_branch = self.repo.active_branch
            
            # Push current active branch (backup/hash)
            push_info = origin.push(refspec=f'{current_branch.name}:{current_branch.name}', force=True)
            
            # ALSO force push this exact commit to the 'main' branch so GitHub main page stays current
            origin.push(refspec=f'{current_branch.name}:main', force=True)
            
            for info in push_info:
                if info.flags & (PushInfo.ERROR | PushInfo.REJECTED):
                    return False, f"Push failed: {info.summary}"
            if not current_branch.tracking_branch():
                self.repo.git.branch('--set-upstream-to', f'origin/{current_branch.name}', current_branch.name)
            return True, None
        except Exception as e:
            return False, f"Failed to push: {e}"

    def checkout(self, commit_hash):
        """Checks out a specific commit, resulting in a 'detached HEAD' state."""
        if not self.is_repo():
            return False, "Not a Git repository."
        try:
            self.repo.git.checkout(commit_hash, force=True)
            return True, None
        except Exception as e:
            return False, f"Failed to checkout commit {commit_hash}: {e}"

    def get_diff_for_commit(self, commit_hash):
        """Gets a stripped-down diff for a specific commit, suitable for an LLM."""
        if not self.is_repo():
            return None, "Not a Git repository."
        try:
            commit = self.repo.commit(commit_hash)
            raw_diff_text = ""
            if commit.parents:
                raw_diff_text = self.repo.git.diff(commit.parents[0].hexsha, commit.hexsha)
            else:
                raw_diff_text = self.repo.git.show(commit_hash, pretty='format:')

            # Filter out the git-specific metadata lines to produce a cleaner diff.
            cleaned_lines = []
            for line in raw_diff_text.splitlines():
                # We only want the file headers (---, +++) and the content lines.
                if not (line.startswith('diff --git') or
                        line.startswith('index ') or
                        line.startswith('similarity index') or
                        line.startswith('rename from') or
                        line.startswith('rename to') or
                        line.startswith('new file mode') or
                        line.startswith('deleted file mode') or
                        line == '\\ No newline at end of file'):
                    cleaned_lines.append(line)
            
            return '\n'.join(cleaned_lines).strip(), None
        except Exception as e:
            return None, f"Failed to get diff for commit {commit_hash}: {e}"

    def delete_commit_and_children(self, commit_hash):
        """Resets the branch(es) containing the specified commit back to the commit's parent."""
        if not self.is_repo():
            return False, "Not a Git repository."
        try:
            commit_to_delete = self.repo.commit(commit_hash)
            if not commit_to_delete.parents:
                return False, "Cannot delete the initial commit of the repository."
            parent_hash = commit_to_delete.parents[0].hexsha

            # Determine if HEAD is on the commit-to-delete or a descendant.
            head_commit = self.repo.head.commit
            is_head_on_deleted_path = (head_commit == commit_to_delete or 
                                     self.repo.is_ancestor(commit_to_delete, head_commit))

            # Find all branches whose tip is the commit-to-delete or one of its descendants.
            branches_to_reset = []
            for branch in self.repo.heads:
                if branch.commit == commit_to_delete or self.repo.is_ancestor(commit_to_delete, branch.commit):
                    branches_to_reset.append(branch)

            if not branches_to_reset and not is_head_on_deleted_path:
                return False, "Could not find a branch or HEAD reference to modify for this commit."

            # If the current HEAD is on a commit being deleted, we must move it first,
            # preserving the working directory to create pending changes.
            if is_head_on_deleted_path:
                if not self.repo.head.is_detached:
                    # On a branch: soft reset moves the branch and stages changes.
                    self.repo.git.reset('--soft', parent_hash)
                else:
                    # Detached HEAD: mixed reset moves HEAD and leaves changes unstaged.
                    self.repo.git.reset(parent_hash)

            # Now, update all the affected branches.
            for branch in branches_to_reset:
                original_tip_hash = branch.commit.hexsha
                try:
                    # If this is the current branch, the reset above already moved it.
                    # Otherwise, force the branch pointer to the parent.
                    is_current_branch = not self.repo.head.is_detached and self.repo.head.reference == branch
                    if not is_current_branch:
                        self.repo.git.branch('-f', branch.name, parent_hash)
                    
                    # Force-push the updated branch to the remote.
                    origin = self.repo.remote(name='origin')
                    push_info = origin.push(refspec=f'{branch.name}:{branch.name}', force=True)

                    for info in push_info:
                        if info.flags & (PushInfo.ERROR | PushInfo.REJECTED):
                            raise GitCommandError(f"Push failed for branch {branch.name}", info.summary)
                
                except Exception as e:
                    # If any step fails, roll back the local branch change.
                    self.repo.git.branch('-f', branch.name, original_tip_hash)
                    return False, f"Failed to update branch {branch.name}: {e}"

            return True, None
        except Exception as e:
            return False, f"Failed to delete history for commit {commit_hash[:7]}: {e}"

    def recreate_history(self):
        """Deletes the entire Git history locally and on the remote."""
        if not self.is_repo(): return False, "Not a Git repository."
        try:
            # --- THIS IS THE CRITICAL FIX ---
            # 1. Read and remember the remote URL *before* deleting anything.
            remote_url = self.repo.remote(name='origin').url
            
            # 2. Delete the local .git folder
            self.delete_local_repo()
            
            # 3. Create a new, clean repository
            self.repo = Repo.init(self.root_path)
            self.repo.git.add(A=True)
            self.repo.index.commit("Fresh Start: New backup history created")
            self.repo.git.branch('-M', 'main')
            
            # 4. Add the remembered remote URL back to the new repo
            origin = self.repo.create_remote('origin', remote_url)
            
            # 5. Now, the push will succeed because 'origin' is defined.
            origin.push(refspec='main:main', force=True)
            self.repo.git.branch('--set-upstream-to=origin/main', 'main')
            
            return True, None
        except Exception as e:
            if not self.repo: self.repo = self._get_repo()
            return False, f"Failed to recreate history: {e}"

    def delete_local_repo(self):
        if not self.is_repo(): return
        self.repo.close()
        self.repo = None
        git_dir = os.path.join(self.root_path, '.git')
        if os.path.exists(git_dir):
            shutil.rmtree(git_dir, ignore_errors=True)

    def delete_github_repo(self, token, username):
        if not self.is_repo(): return False, "Not a Git repository."
        try:
            remote_url = self.repo.remote(name='origin').url
            repo_name = remote_url.split('/')[-1].replace('.git', '')
        except ValueError:
            return False, "No remote GitHub repository is configured."
        url = f"https://api.github.com/repos/{username}/{repo_name}"
        headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"}
        try:
            response = requests.delete(url, headers=headers)
            if response.status_code == 404: return True, None
            response.raise_for_status()
            return True, None
        except requests.exceptions.HTTPError as e:
            message = e.response.json().get('message', 'Unknown error')
            return False, f"GitHub API Error: {message}"
        except Exception as e:
            return False, f"An unexpected error occurred: {e}"